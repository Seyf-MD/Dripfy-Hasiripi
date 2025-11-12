import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import nodemailer from 'nodemailer';
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

/**
 * Geliştirme sırasında çalışan mini API:
 * - /api/signup/send-code → doğrulama kodu gönderir
 * - /api/signup          → kodu doğrular, talepleri hafızada tutar
 * - /api/signup/requests → admin paneline pending talepleri verir
 * Not: Üretimde PHP versiyonu kullanılmaktadır; bu dosya yalnızca dev deneyimini iyileştirir.
 */

const app = express();
const port = Number(process.env.API_PORT || 4000);

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

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`[signup-mailer] Missing required environment variables: ${missingEnv.join(', ')}`);
}

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET environment variable is not set. Authentication will fail.');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log('[signup-mailer] SMTP connection verified');
  } catch (error) {
    console.error('[signup-mailer] SMTP verification failed:', error);
  }
}

verifyTransporter();

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

function buildInfoLines(payload) {
  const lines = [
    `İsim: ${payload.name}`,
    `E-posta: ${payload.email}`,
    `Telefon: ${formatPhone(payload)}`,
    `Pozisyon: ${payload.position}`,
  ];
  if (payload.company) {
    lines.push(`Firma: ${payload.company}`);
  }
  if (payload.country) {
    lines.push(`Ülke: ${payload.country}`);
  }
  return lines;
}

// Mirrors the PHP helpers in public/api/signup/common.php so dev + prod mails match.
function buildEmailTemplate(title, intro, contentHtml, footerNote = '') {
  const year = new Date().getFullYear();
  const footerBlock = footerNote
    ? `<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:rgba(47,74,59,0.7);">${footerNote}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dripfy MIS</title>
  </head>
  <body style="margin:0;padding:0;background-color:#edf6ed;font-family:'Montserrat','Segoe UI',sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#edf6ed;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;border-radius:28px;overflow:hidden;background-color:#faf9f6;border:1px solid #c8d9b9;box-shadow:0 22px 60px rgba(200,217,185,0.45);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#4ba586 0%,#84a084 70%,#94a073 100%);">
                <table role="presentation" width="100%">
                  <tr>
                    <td align="left">
                      <span style="display:inline-block;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,250,244,0.9);font-weight:600;">Dripfy MIS</span>
                    </td>
                    <td align="right">
                      <img src="https://hasiripi.com/assets/logo-wordmark.png" alt="Dripfy" style="height:32px;border:0;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 42px;color:#1e332a;">
                <h1 style="margin:0 0 12px;font-size:26px;color:#1e332a;line-height:32px;">${title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:rgba(47,74,59,0.85);">${intro}</p>
                ${contentHtml}
                ${footerBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f3f9f3;border-top:1px solid #c8d9b9;">
                <p style="margin:0;font-size:12px;line-height:18px;color:rgba(47,74,59,0.7);">
                  © ${year} Dripfy MIS. Tüm hakları saklıdır.<br>
                  Bu mesajı <a href="mailto:info@dripfy.de" style="color:#4ba586;text-decoration:none;">info@dripfy.de</a> üzerinden yanıtlayabilirsiniz.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildKeyValueList(pairs) {
  const rows = Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => {
      const safeLabel = String(label).trim();
      const safeValue = String(value).trim();
      return `<tr>
        <td style="padding:10px 14px;font-size:13px;color:rgba(47,74,59,0.8);background:#f3f9f3;border-radius:14px 0 0 14px;border:1px solid #c8d9b9;border-right:0;">${safeLabel}</td>
        <td style="padding:10px 14px;font-size:13px;color:#1e332a;background:#edf6ed;border-radius:0 14px 14px 0;border:1px solid #c8d9b9;border-left:0;">${safeValue}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-spacing:0 8px;margin:0 0 12px;">${rows}</table>`;
}

function buildCodeBlock(code) {
  return `<div style="margin:0 0 24px;">
    <div style="display:inline-block;padding:18px 28px;border-radius:18px;background:linear-gradient(135deg,rgba(75,165,134,0.12),rgba(148,174,161,0.08));border:1px solid #c8d9b9;">
      <span style="font-size:28px;letter-spacing:0.4em;color:#1e332a;font-weight:600;">${code}</span>
    </div>
  </div>`;
}

async function sendMailWithContent({ to, subject, text, html }) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
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
  const ttlMinutes = Math.ceil(SIGNUP_CODE_TTL / (60 * 1000));
  const requestId = generateRequestId();
  const subject = 'Dripfy Yönetim Paneli | Doğrulama Kodunuz';
  const displayName = data.firstName || data.name;
  const text = `Merhaba ${displayName},\n\nDripfy Yönetim Paneli doğrulama kodunuz: ${code}\nKod ${ttlMinutes} dakika boyunca geçerlidir. Talep size ait değilse bu mesajı yok sayabilirsiniz.\n\nDripfy Ekibi`;
  const html = buildEmailTemplate(
    'Doğrulama kodunuz',
    'Dripfy Yönetim Paneli\'ne güvenle erişebilmeniz için doğrulama kodunuz hazır.',
    `${buildCodeBlock(code)}
      <p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#2f4a3b;">Kod ${ttlMinutes} dakika boyunca geçerlidir. Talep size ait değilse lütfen bu mesajı görmezden gelin.</p>
      <a href="https://hasiripi.com" style="display:inline-block;padding:14px 28px;border-radius:16px;background:linear-gradient(135deg,#4ba586,#84a084);color:#0b1612;font-weight:600;text-decoration:none;font-size:14px;">Paneli Aç</a>`,
    'Sorularınız için <a href="mailto:info@dripfy.de" style="color:#84a084;text-decoration:none;">info@dripfy.de</a> adresinden bize ulaşabilirsiniz.'
  );

  try {
    await sendMailWithContent({ to: data.email, subject, text, html });
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

  const infoLines = buildInfoLines(payload);
  const infoText = infoLines.join('\n');
  const detailPairs = {
    'Ad Soyad': payload.name,
    'E-posta': payload.email,
    'Telefon': formatPhone(payload),
    Pozisyon: payload.position,
    Firma: payload.company,
    Ülke: payload.country,
  };
  const detailTable = buildKeyValueList(detailPairs);

  const adminRecipient = process.env.SIGNUP_NOTIFY_TO || process.env.SMTP_USER;
  const adminSubject = `[Dripfy] Yeni kayıt talebi - ${payload.name}`;
  const submittedAt = new Date().toLocaleString();
  const adminHtml = buildEmailTemplate(
    'Yeni kayıt talebi',
    'Merhaba, Dripfy yönetim paneline yeni bir kayıt talebi ulaştı.',
    `${detailTable}<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:#2f4a3b;">Gönderilme tarihi: ${submittedAt}</p>`,
    'Talebi panel üzerinden inceleyebilirsiniz.'
  );

  const shouldSendWelcome = process.env.SEND_WELCOME_EMAIL !== 'false';
  const welcomeSubject = 'Dripfy Yönetim Paneli | Talebiniz Alındı';
  const welcomeHtml = buildEmailTemplate(
    'Talebiniz bize ulaştı',
    'Dripfy Yönetim Paneli kayıt talebiniz başarıyla kaydedildi. Ekibimiz bilgilerinizi inceleyerek kısa süre içerisinde dönüş yapacak.',
    `<p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#2f4a3b;"><strong>Bilgileriniz</strong></p>${detailTable}<p style="margin:12px 0 0;font-size:13px;line-height:20px;color:rgba(47,74,59,0.8);">Her türlü soru ve isteğiniz için bu e-postaya yanıt verebilirsiniz.</p>`,
    'Saygılarımızla, Dripfy Ekibi'
  );

  try {
    await sendMailWithContent({
      to: adminRecipient,
      subject: adminSubject,
      text: `Merhaba,\n\nDripfy yönetim paneline yeni bir kayıt talebi ulaştı:\n\n${infoText}\n\nGönderilme tarihi: ${submittedAt}\n\nPanel üzerinden talebi inceleyebilirsiniz.\n\nDripfy Otomasyon Hizmeti`,
      html: adminHtml,
    });

    if (shouldSendWelcome) {
      await sendMailWithContent({
        to: payload.email,
        subject: welcomeSubject,
        text: `Merhaba ${payload.firstName || payload.name},\n\nDripfy Yönetim Paneli kayıt talebiniz bize ulaştı. Ekibimiz bilgilerinizi inceleyerek en kısa sürede sizinle iletişime geçecek.\n\nBilgileriniz:\n${infoText}\n\nHer türlü sorunuz için bu e-postaya yanıt verebilirsiniz.\n\nSaygılarımızla,\nDripfy Ekibi`,
        html: welcomeHtml,
      });
    }

    deleteSignupCodeRecord(email);

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
