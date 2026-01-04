import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRouter from './auth/index.js';
import { authenticate } from './auth/middleware.js';
import adminRouter from './admin/index.js';
import { ensureDataEnvironment } from './services/storageService.js';
import { startDailyBackupScheduler } from './services/backupService.js';
import { addSignupRequest, listSignupRequests, removeSignupRequest } from './services/signupRequestService.js';
import { recordErrorLog } from './services/logService.js';
import {
  SIGNUP_CODE_TTL,
  createSignupCodeRecord,
  deleteSignupCodeRecord,
  verifySignupCodeAttempt,
} from './signupCodesStore.js';
import { readWebsiteCopy, writeWebsiteCopy } from './services/legalCopyService.js';
import {
  sendVerificationCodeEmail,
  sendSignupReceivedEmail,
  sendSignupAdminNotification,
  initEmailService
} from './services/emailService.js';
import {
  getMessagesForUser,
  sendMessage,
  markMessageAsRead
} from './services/messageService.js';

/**
 * Geliştirme sırasında çalışan mini API:
 * - /api/signup/send-code → doğrulama kodu gönderir
 * - /api/signup          → kodu doğrular, talepleri hafızada tutar
 * - /api/signup/requests → admin paneline pending talepleri verir
 * Not: Üretimde PHP versiyonu kullanılmaktadır; bu dosya yalnızca dev deneyimini iyileştirir.
 */

const app = express();
const port = Number(process.env.API_PORT || 4000);

// Initialize email service
// Initialize email service
process.on('exit', (code) => console.log(`Process exiting with code: ${code}`));
process.on('SIGINT', () => { console.log('Received SIGINT'); process.exit(); });
process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1); });

initEmailService();

// Prevent process from exiting (temporary fix for development)
setInterval(() => { }, 1 << 30);

ensureDataEnvironment()
  .then(() => {
    startDailyBackupScheduler();
  })
  .catch((error) => {
    console.error('[bootstrap] Failed to prepare data environment:', error);
  });

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(v => v.trim()) : true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

const adminOnlyMiddleware = authenticate({ requiredRole: 'admin' });

const LEGAL_PAGE_KEYS = ['impressum', 'privacy', 'terms'];
const LEGAL_LANGUAGE_CODES = ['tr', 'en', 'de', 'ru', 'ar'];

app.get('/api/legal-copy', async (_req, res) => {
  try {
    const copy = await readWebsiteCopy();
    return res.json({ ok: true, data: copy });
  } catch (error) {
    console.error('[legal-copy] Failed to read legal content:', error);
    return res.status(500).json({ ok: false, error: 'Failed to load legal content.' });
  }
});

app.post('/api/legal-copy', adminOnlyMiddleware, async (req, res) => {
  try {
    const currentCopy = await readWebsiteCopy();
    const updates = req.body ?? {};

    const mergedLegal = {};
    for (const page of LEGAL_PAGE_KEYS) {
      mergedLegal[page] = {
        ...((currentCopy.legalContent ?? {})[page] || {}),
      };
    }

    if (updates.legalContent && typeof updates.legalContent === 'object') {
      for (const page of LEGAL_PAGE_KEYS) {
        const pageUpdates = updates.legalContent[page];
        if (!pageUpdates || typeof pageUpdates !== 'object') continue;
        for (const [lang, value] of Object.entries(pageUpdates)) {
          if (!LEGAL_LANGUAGE_CODES.includes(lang)) continue;
          if (typeof value !== 'string') continue;
          mergedLegal[page][lang] = value;
        }
      }
    }

    const mergedFooter = {
      ...((currentCopy.footer) || {}),
    };
    if (updates.footer && typeof updates.footer === 'object') {
      if (typeof updates.footer.companyName === 'string') {
        mergedFooter.companyName = updates.footer.companyName;
      }
      if (Array.isArray(updates.footer.addressLines)) {
        mergedFooter.addressLines = updates.footer.addressLines
          .filter(line => typeof line === 'string')
          .map(line => line.trim())
          .filter(Boolean);
      }
      if (typeof updates.footer.email === 'string') {
        mergedFooter.email = updates.footer.email;
      }
      if (typeof updates.footer.phone === 'string') {
        mergedFooter.phone = updates.footer.phone;
      }
    }

    const newCopy = {
      legalContent: mergedLegal,
      footer: mergedFooter,
    };

    await writeWebsiteCopy(newCopy);
    return res.json({ ok: true, data: newCopy });
  } catch (error) {
    console.error('[legal-copy] Failed to save legal content:', error);
    return res.status(500).json({ ok: false, error: 'Failed to save legal content.' });
  }
});

const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SIGNUP_RATE_LIMIT_MAX = Math.max(
  1,
  Number(process.env.SIGNUP_RATE_LIMIT_PER_MINUTE || 10),
);

const buildRateLimitResponse = (retryAfterSeconds, reference) => ({
  ok: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Çok fazla deneme yaptınız. Lütfen biraz sonra tekrar deneyin.',
    retryAfterSeconds,
    reference,
  },
});

const signupRateLimiter = rateLimit({
  windowMs: SIGNUP_RATE_LIMIT_WINDOW_MS,
  max: SIGNUP_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, _next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    const reference = `rl-${Date.now().toString(36)}`;
    res.set('Retry-After', retryAfterSeconds.toString());
    console.warn(`[rate-limit] Too many requests for ${req.ip} on ${req.originalUrl} (ref=${reference})`);
    res.status(429).json(buildRateLimitResponse(retryAfterSeconds, reference));
  },
});

function normaliseSignupPayload(payload) {
  const safeString = (value) => (typeof value === 'string' ? value.trim() : '');

  const firstName = safeString(payload.firstName);
  const lastName = safeString(payload.lastName);
  const legacyName = safeString(payload.name);

  const name =
    (firstName || lastName) ? [firstName, lastName].filter(Boolean).join(' ') : legacyName;

  const email = safeString(payload.email);
  const position = safeString(payload.position);
  const company = safeString(payload.company);
  const countryCode = safeString(payload.countryCode);
  const phoneDigits = safeString(payload.phone || payload.phoneNumber).replace(/[^0-9]/g, '');
  const country = safeString(payload.country);

  return {
    firstName,
    lastName,
    name,
    email,
    position,
    company,
    countryCode,
    phoneDigits,
    country,
  };
}

function validateSignupPayload(payload, { requireNames = true } = {}) {
  const normalised = normaliseSignupPayload(payload);
  const { name, email, phoneDigits, position, firstName, countryCode } = normalised;

  const hasName = firstName && firstName.length >= 2;

  if (requireNames) {
    if (!hasName && (!name || name.length < 2)) {
      return { error: 'İsim eksik veya çok kısa' };
    }
  } else if (!name || name.length < 2) {
    return { error: 'İsim eksik veya çok kısa' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Geçersiz e-posta adresi' };
  }

  if (!phoneDigits || phoneDigits.length < 6) {
    return { error: 'Telefon numarası eksik veya çok kısa' };
  }

  if (!position) {
    return { error: 'Pozisyon seçimi gerekli' };
  }

  if (!countryCode) {
    return { error: 'Ülke kodu gerekli' };
  }

  return { payload: normalised };
}

function formatPhone(payload) {
  const countryCode = payload.countryCode || '';
  const phoneDigits = payload.phoneDigits || '';
  return `${countryCode}${countryCode ? ' ' : ''}${phoneDigits}`.trim();
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateRequestId() {
  return 'sr' + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

app.post('/api/signup/send-code', signupRateLimiter, async (req, res) => {
  const validation = validateSignupPayload(req.body) || {};
  if (validation.error) {
    return res.status(400).json({ ok: false, error: validation.error });
  }
  const data = validation.payload;
  data.name = data.name || `${data.firstName} ${data.lastName}`.trim();

  const code = generateVerificationCode();
  const requestId = generateRequestId();
  const lang = req.body.language || 'tr';

  try {
    await sendVerificationCodeEmail({
      email: data.email,
      name: data.firstName || data.name,
      code,
      lang
    });

    createSignupCodeRecord({ email: data.email, code, payload: data });
    console.log(`[signup-mailer] requestId=${requestId} email=${data.email.toLowerCase()}`);

    if (process.env.DEBUG_SIGNUP_CODES === 'true') {
      console.debug('[signup-mailer] debug verification payload', {
        requestId,
        email: data.email,
        code,
      });
    }
    return res.json({ ok: true });
  } catch (mailError) {
    console.error('[signup-mailer] Kod gönderimi başarısız:', mailError);
    return res.status(500).json({ ok: false, error: 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
  }
});

app.post('/api/signup', signupRateLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Geçersiz e-posta adresi' });
  }

  if (!code || !/^[0-9]{6}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'Doğrulama kodu eksik veya geçersiz' });
  }

  const result = verifySignupCodeAttempt({ email, code });

  if (result.status === 'not-found' || result.status === 'expired') {
    deleteSignupCodeRecord(email);
    return res.status(400).json({ ok: false, error: 'Doğrulama kodu bulunamadı veya süresi doldu' });
  }

  if (result.status === 'locked') {
    return res.status(400).json({
      ok: false,
      error: 'Çok fazla yanlış deneme. Lütfen yeni bir doğrulama kodu talep edin.',
    });
  }

  if (result.status === 'mismatch') {
    return res.status(400).json({ ok: false, error: 'Geçersiz doğrulama kodu' });
  }

  if (result.status !== 'valid') {
    return res.status(400).json({ ok: false, error: 'Doğrulama kodu bulunamadı veya süresi doldu' });
  }

  const payload = result.payload;
  payload.name = payload.name || `${payload.firstName} ${payload.lastName}`.trim();

  // Create Request Object
  const createdAt = Date.now();
  const request = {
    id: generateRequestId(),
    name: payload.name,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    countryCode: payload.countryCode,
    country: payload.country,
    phone: formatPhone(payload),
    position: payload.position,
    company: payload.company,
    status: 'pending',
    timestamp: new Date(createdAt).toISOString(),
  };

  const details = {
    'Ad Soyad': payload.name,
    'E-posta': payload.email,
    'Telefon': formatPhone(payload),
    Pozisyon: payload.position,
    Firma: payload.company,
    Ülke: payload.country,
  };

  try {
    // Notify Admin
    await sendSignupAdminNotification({
      name: payload.name,
      email: payload.email,
      details
    });

    // Notify User
    if (process.env.SEND_WELCOME_EMAIL !== 'false') {
      const userLang = payload.language || 'tr';
      await sendSignupReceivedEmail({
        email: payload.email,
        name: payload.firstName || payload.name,
        lang: userLang
      });
    }

    deleteSignupCodeRecord(email);
    await addSignupRequest(request);

    return res.json({
      ok: true,
      payload: request,
    });
  } catch (err) {
    console.error('[signup-mailer] Mail gönderimi başarısız:', err);
    return res.status(500).json({ ok: false, error: 'Mail gönderilemedi' });
  }
});

app.use('/api/signup', adminOnlyMiddleware);

app.get('/api/signup/requests', async (_req, res) => {
  try {
    const requests = await listSignupRequests();
    res.json({ ok: true, requests });
  } catch (error) {
    console.error('[signup] Failed to list requests:', error);
    res.status(500).json({ ok: false, error: 'Kayıt talepleri yüklenemedi' });
  }
});

app.post('/api/signup/requests', async (req, res) => {
  const id = typeof req.body.id === 'string' ? req.body.id : '';
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Kayıt talebi bulunamadı' });
  }
  try {
    const removed = await removeSignupRequest(id);
    if (!removed) {
      return res.status(404).json({ ok: false, error: 'Kayıt talebi bulunamadı' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('[signup] Failed to remove request:', error);
    res.status(500).json({ ok: false, error: 'Kayıt talebi silinemedi' });
  }
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/messages', authenticate(), async (req, res) => {
  try {
    console.log('[API] /api/messages called by user:', req.user.id, 'Role:', req.user.role);
    const messages = await getMessagesForUser(req.user.id, req.user.role);
    console.log('[API] Messages found:', messages.length);
    res.json({ ok: true, messages });
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ ok: false, error: 'Mesajlar yüklenemedi' });
  }
});

app.post('/api/messages', authenticate(), async (req, res) => {
  try {
    const { toId, content, subject, parentId, language, theme } = req.body;

    // Save user preferences if provided
    if (language || theme) {
      try {
        await import('./services/userService.js').then(m =>
          m.updateUser(req.user.id, {
            language: language || undefined,
            theme: theme || undefined
          })
        );
      } catch (updateErr) {
        console.warn('[API] Failed to update user preferences during message send:', updateErr);
      }
    }

    const msg = await sendMessage({
      fromId: req.user.id,
      fromName: req.user.name,
      toId,
      content,
      subject,
      parentId
    });

    // If message is to admin, send email notification
    if (toId === 'admin') {
      import('./services/emailService.js').then(m => {
        m.sendAdminMessageEmail({
          fromName: req.user.name,
          fromEmail: req.user.email,
          content: content,
          lang: language || 'en',
          theme: theme || 'light'
        });
      }).catch(err => console.error('Failed to trigger admin email:', err));
    }

    res.json({ ok: true, message: msg });
  } catch (error) {
    console.error('Failed to send message:', error);
    res.status(500).json({ ok: false, error: 'Mesaj gönderilemedi' });
  }
});

app.patch('/api/messages/:id/read', authenticate(), async (req, res) => {
  try {
    await markMessageAsRead(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false });
  }
});

app.use((err, req, res, next) => {
  console.error('[api] Unhandled error:', err);
  recordErrorLog({
    message: err?.message || 'Unknown error',
    stack: err?.stack,
    context: {
      path: req.originalUrl,
      method: req.method,
    },
  }).catch((logError) => {
    console.error('[api] Failed to record error log:', logError);
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ ok: false, error: 'Beklenmeyen bir hata oluştu' });
});

app.listen(port, () => {
  console.log(`[signup-mailer] API dinlemede http://localhost:${port}`);
});
