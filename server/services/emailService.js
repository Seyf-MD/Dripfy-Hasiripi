import nodemailer from 'nodemailer';

const TRANSPORTER_CONFIG = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

let transporter = null;

export async function initEmailService() {
    if (transporter) return;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('[email-service] Missing SMTP credentials. Email sending will be disabled.');
        return;
    }

    transporter = nodemailer.createTransport(TRANSPORTER_CONFIG);
    try {
        await transporter.verify();
        console.log('[email-service] SMTP connection verified');
    } catch (error) {
        console.error('[email-service] SMTP verification failed:', error);
        transporter = null;
    }
}

const STYLES = {
    body: 'margin:0;padding:0;background-color:#0b1612;font-family:\'Montserrat\',\'Segoe UI\',sans-serif;color:#e2e8f0;',
    container: 'max-width:600px;margin:0 auto;background-color:#1a2c24;border-radius:24px;overflow:hidden;border:1px solid #2f4a3b;box-shadow:0 20px 50px rgba(0,0,0,0.5);',
    header: 'padding:32px;background:linear-gradient(135deg,rgba(75,165,134,0.15) 0%,rgba(11,22,18,0.4) 100%);border-bottom:1px solid #2f4a3b;',
    content: 'padding:40px 32px;color:#e2e8f0;',
    title: 'margin:0 0 16px;font-size:24px;color:#ffffff;font-weight:600;letter-spacing:-0.02em;',
    text: 'margin:0 0 24px;font-size:15px;line-height:26px;color:#94a3b8;',
    button: 'display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#4ba586 0%,#3d8b6f 100%);color:#ffffff;text-decoration:none;border-radius:16px;font-weight:600;font-size:14px;letter-spacing:0.02em;box-shadow:0 4px 12px rgba(75,165,134,0.3);',
    footer: 'padding:24px 32px;background-color:#111e18;border-top:1px solid #2f4a3b;text-align:center;',
    footerText: 'margin:0;font-size:12px;line-height:18px;color:#64748b;',
    codeBlock: 'margin:0 0 24px;background:rgba(0,0,0,0.2);padding:24px;border-radius:16px;border:1px solid #2f4a3b;text-align:center;',
    code: 'font-size:32px;letter-spacing:0.2em;color:#4ba586;font-weight:700;font-family:monospace;'
};

const TEXTS = {
    tr: {
        inviteParams: {
            subject: 'Dripfy Yönetim Paneli Daveti',
            title: 'Aramıza Hoş Geldiniz',
            intro: (name) => `Merhaba ${name}, sizi Dripfy Yönetim Paneli'ne davet ediyoruz.`,
            action: 'Hesabınıza Giriş Yapın',
            credsTitle: 'Giriş Bilgileriniz',
        },
        footer: {
            copyright: '© 2025 Dripfy. Tüm hakları saklıdır.',
        },
        requestReceived: {
            subject: 'Talebiniz Alındı',
            title: 'Talebiniz Bize Ulaştı',
            intro: (name) => `Merhaba ${name}, Dripfy Yönetim Paneli için kayıt talebiniz başarıyla alındı. Ekibimiz bilgilerinizi inceledikten sonra size dönüş yapacaktır.`,
        }
    },
    en: {
        inviteParams: {
            subject: 'Dripfy Admin Panel Invitation',
            title: 'Welcome Aboard',
            intro: (name) => `Hello ${name}, you have been invited to the Dripfy Admin Panel.`,
            action: 'Login to Your Account',
            credsTitle: 'Your Credentials',
        },
        footer: {
            copyright: '© 2025 Dripfy. All rights reserved.',
        },
        requestReceived: {
            subject: 'Request Received',
            title: 'We Received Your Request',
            intro: (name) => `Hello ${name}, your signup request for Dripfy Admin Panel has been received. Our team will review your details and get back to you shortly.`,
        }
    }
};

function getTemplate(lang = 'tr') {
    return TEXTS[lang] || TEXTS['tr'];
}

function buildHtml(title, content, lang = 'tr') {
    const t = getTemplate(lang);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${STYLES.body}">
  <div style="padding:40px 16px;">
    <div style="${STYLES.container}">
      <div style="${STYLES.header}">
        <img src="https://hasiripi.com/assets/logo-wordmark.png" alt="Dripfy" style="height:32px;display:block;">
      </div>
      <div style="${STYLES.content}">
        <h1 style="${STYLES.title}">${title}</h1>
        ${content}
      </div>
      <div style="${STYLES.footer}">
        <p style="${STYLES.footerText}">
          ${t.footer.copyright}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendInviteEmail({ email, name, password, position, lang = 'tr' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = getTemplate(lang).inviteParams;

    const content = `
    <p style="${STYLES.text}">${t.intro(name)}</p>
    <div style="margin-bottom:24px;border:1px solid #2f4a3b;border-radius:12px;padding:20px;background:rgba(255,255,255,0.03);">
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
      <p style="margin:0 0 16px;color:#e2e8f0;font-weight:500;">${email}</p>
      
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Password</p>
      <p style="margin:0;color:#e2e8f0;font-weight:500;font-family:monospace;background:rgba(0,0,0,0.2);padding:8px 12px;border-radius:6px;display:inline-block;">${password}</p>
    </div>
    <p style="${STYLES.text}">Pozisyon: ${position}</p>
    <div style="text-align:center;margin-top:32px;">
      <a href="https://hasiripi.com/admin" style="${STYLES.button}">${t.action}</a>
    </div>
  `;

    const html = buildHtml(t.title, content, lang);

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: t.subject,
            html
        });
        return true;
    } catch (error) {
        console.error('[email-service] Failed to send invite email:', error);
        throw error;
    }
}

export async function sendSignupReceivedEmail({ email, name, lang = 'tr' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = getTemplate(lang).requestReceived;

    const content = `
    <p style="${STYLES.text}">${t.intro(name)}</p>
  `;

    const html = buildHtml(t.title, content, lang);

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: t.subject,
            html
        });
        return true;
    } catch (error) {
        console.error('[email-service] Failed to send signup received email:', error);
        throw error;
    }
}

export async function sendSignupAdminNotification({ name, email, details }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const adminRecipient = process.env.SIGNUP_NOTIFY_TO || process.env.SMTP_USER;
    const content = `
    <p style="${STYLES.text}">Yeni Bir Kayıt Talebi Mevcut</p>
    <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:12px;">
       ${Object.entries(details).map(([k, v]) => `<p style="margin:4px 0;"><strong style="color:#fff;">${k}:</strong> <span style="color:#cbd5e1;">${v}</span></p>`).join('')}
    </div>
  `;

    const html = buildHtml('Yeni Kayıt Talebi', content, 'tr');

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminRecipient,
            subject: `[Dripfy] Yeni Kayıt: ${name}`,
            html
        });
    } catch (err) {
        console.error('[email-service] Failed to notify admin:', err);
    }
}

export async function sendVerificationCodeEmail({ email, name, code, lang = 'tr' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = {
        subject: lang === 'en' ? 'Dripfy Verification Code' : 'Dripfy Doğrulama Kodu',
        title: lang === 'en' ? 'Your Verification Code' : 'Doğrulama Kodunuz',
        intro: lang === 'en'
            ? `Hello ${name}, use the code below to verify your email address.`
            : `Merhaba ${name}, e-posta adresinizi doğrulamak için aşağıdaki kodu kullanın.`,
    };

    const content = `
    <p style="${STYLES.text}">${t.intro}</p>
    <div style="${STYLES.codeBlock}">
       <span style="${STYLES.code}">${code}</span>
    </div>
  `;

    const html = buildHtml(t.title, content, lang);

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: email,
            subject: t.subject,
            html
        });
        return true;
    } catch (error) {
        console.error('[email-service] Failed to send verification code:', error);
        throw error;
    }
}
