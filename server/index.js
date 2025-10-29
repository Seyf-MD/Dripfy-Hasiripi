import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

/**
 * Geliştirme sırasında çalışan mini API:
 * - /api/signup/send-code → doğrulama kodu gönderir
 * - /api/signup          → kodu doğrular, talepleri hafızada tutar
 * - /api/signup/requests → admin paneline pending talepleri verir
 * Not: Üretimde PHP versiyonu kullanılmaktadır; bu dosya yalnızca dev deneyimini iyileştirir.
 */

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(v => v.trim()) : true,
  credentials: false,
}));
app.use(express.json());

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`[signup-mailer] Missing required environment variables: ${missingEnv.join(', ')}`);
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

const SIGNUP_CODE_TTL = Number(process.env.SIGNUP_CODE_TTL || 10 * 60 * 1000);
const signupCodeStore = new Map();
// Hafıza içinde tutulan pending talepler (yalnızca dev modunda gereklidir).
const signupRequestsStore = [];

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

app.post('/api/signup/send-code', async (req, res) => {
  const validation = validateSignupPayload(req.body) || {};
  if (validation.error) {
    return res.status(400).json({ ok: false, error: validation.error });
  }
  const data = validation.payload;
  data.name = data.name || `${data.firstName} ${data.lastName}`.trim();

  const code = generateVerificationCode();
  const subject = 'Dripfy doğrulama kodunuz';
  const text = `Merhaba ${data.firstName || data.name},\n\nDripfy hesabınızı doğrulamak için bu kodu kullanın: ${code}\nKod 10 dakika boyunca geçerlidir.`;
  const html = `<p>Merhaba <strong>${data.firstName || data.name}</strong>,</p>
    <p>Dripfy hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
    <p>Bu kod 10 dakika boyunca geçerlidir.</p>`;

  try {
    await sendMailWithContent({ to: data.email, subject, text, html });
    const expires = Date.now() + SIGNUP_CODE_TTL;
    signupCodeStore.set(data.email.toLowerCase(), { code, expires, payload: data });
    console.log(`[signup-mailer] Verification code ${code} sent to ${data.email}`);
    return res.json({ ok: true });
  } catch (mailError) {
    console.error('[signup-mailer] Kod gönderimi başarısız:', mailError);
    return res.status(500).json({ ok: false, error: 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.' });
  }
});

app.post('/api/signup', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Geçersiz e-posta adresi' });
  }

  if (!code || !/^[0-9]{6}$/.test(code)) {
    return res.status(400).json({ ok: false, error: 'Doğrulama kodu eksik veya geçersiz' });
  }

  const storeKey = email.toLowerCase();
  const entry = signupCodeStore.get(storeKey);

  if (!entry || entry.expires < Date.now()) {
    signupCodeStore.delete(storeKey);
    return res.status(400).json({ ok: false, error: 'Doğrulama kodu bulunamadı veya süresi doldu' });
  }

  if (entry.code !== code) {
    return res.status(400).json({ ok: false, error: 'Geçersiz doğrulama kodu' });
  }

  const payload = entry.payload;
  payload.name = payload.name || `${payload.firstName} ${payload.lastName}`.trim();

  const infoLines = buildInfoLines(payload);
  const infoText = infoLines.join('\n');

  const adminRecipient = process.env.SIGNUP_NOTIFY_TO || process.env.SMTP_USER;
  const adminSubject = `[Dripfy] Yeni kayıt talebi - ${payload.name}`;
  const adminHtml = `<p>Yeni bir kayıt talebi aldınız:</p><ul>${infoLines
    .map((line) => {
      const [label, value] = line.split(':');
      return `<li><strong>${label.trim()}:</strong> ${value.trim()}</li>`;
    })
    .join('')}</ul><p>Gönderilme tarihi: ${new Date().toLocaleString()}</p>`;

  const shouldSendWelcome = process.env.SEND_WELCOME_EMAIL !== 'false';
  const welcomeSubject = 'Dripfy Kaydınız Alındı';
  const welcomeHtml = `<p>Merhaba <strong>${payload.firstName || payload.name}</strong>,</p>
    <p>Dripfy’ye gösterdiğiniz ilgi için teşekkür ederiz. Ekibimiz en kısa sürede sizinle iletişime geçecek.</p>
    <p><strong>Bilgileriniz:</strong></p><ul>${infoLines
      .map((line) => {
        const [label, value] = line.split(':');
        return `<li><strong>${label.trim()}:</strong> ${value.trim()}</li>`;
      })
      .join('')}</ul><p>Sevgiler,<br/>Dripfy Ekibi</p>`;

  try {
    await sendMailWithContent({
      to: adminRecipient,
      subject: adminSubject,
      text: `Yeni bir kayıt talebi aldınız:\n\n${infoText}`,
      html: adminHtml,
    });

    if (shouldSendWelcome) {
      await sendMailWithContent({
        to: payload.email,
        subject: welcomeSubject,
        text: `Merhaba ${payload.firstName || payload.name},\n\nDripfy’ye gösterdiğiniz ilgi için teşekkür ederiz. Ekibimiz en kısa sürede sizinle iletişime geçecek.\n\nBilgileriniz:\n${infoText}`,
        html: welcomeHtml,
      });
    }

    signupCodeStore.delete(storeKey);

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
    signupRequestsStore.push(request);

    return res.json({
      ok: true,
      payload: request,
    });
  } catch (err) {
    console.error('[signup-mailer] Mail gönderimi başarısız:', err);
    return res.status(500).json({ ok: false, error: 'Mail gönderilemedi' });
  }
});

app.get('/api/signup/requests', (req, res) => {
  const sorted = [...signupRequestsStore].sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
  );
  res.json({ ok: true, requests: sorted });
});

app.post('/api/signup/requests', (req, res) => {
  const id = typeof req.body.id === 'string' ? req.body.id : '';
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Kayıt talebi bulunamadı' });
  }
  const index = signupRequestsStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ ok: false, error: 'Kayıt talebi bulunamadı' });
  }
  signupRequestsStore.splice(index, 1);
  res.json({ ok: true });
});

app.get('/api/health', (_, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.listen(port, () => {
  console.log(`[signup-mailer] API dinlemede http://localhost:${port}`);
});
