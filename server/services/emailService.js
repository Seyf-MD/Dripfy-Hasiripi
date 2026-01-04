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

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_HOST === 'smtp.yourprovider.com') {
        console.warn('[email-service] Missing or dummy SMTP credentials. Email sending will be disabled.');
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

const buildStyles = (theme = 'light') => {
    const isDark = (theme === 'dark');
    // Colors
    const bodyBg = isDark ? '#0f172a' : '#edf6ed';
    const tableBg = isDark ? '#020408' : '#edf6ed'; // Outer table bg
    const containerBg = isDark ? 'rgba(255,255,255,0.03)' : '#faf9f6';
    const containerBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #c8d9b9';
    const containerShadow = isDark ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 22px 60px rgba(200,217,185,0.45)';
    const headerGradient = 'linear-gradient(90deg, #4ba586, #84a084)'; // Same for both or slightly adjusted
    const mainText = isDark ? '#ffffff' : '#1e332a';
    const subText = isDark ? '#cbd5e1' : 'rgba(47,74,59,0.85)';
    const contentBoxBg = isDark ? 'rgba(255,255,255,0.05)' : '#f3f9f3';
    const contentBoxBorder = isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #c8d9b9';
    const footerBg = isDark ? 'rgba(0,0,0,0.2)' : '#f3f9f3';
    const footerText = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(47,74,59,0.7)';
    const footerLink = isDark ? 'rgba(255,255,255,0.5)' : '#4ba586';

    return {
        body: `margin:0;padding:0;background-color:${bodyBg};font-family:'Outfit','Helvetica Neue','Segoe UI',sans-serif;color:${mainText};`,
        outerTable: `background-color:${tableBg};padding:40px 10px;`,
        container: `max-width:600px;margin:0 auto;border-radius:32px;overflow:hidden;background-color:${containerBg};border:${containerBorder};box-shadow:${containerShadow};backdrop-filter:blur(20px);`,
        headerLine: `height:4px;width:100%;background:${headerGradient};`,
        logoCell: `padding:40px 40px 20px;text-align:center;`,
        contentCell: `padding:10px 40px 40px;color:${subText};text-align:left;`,
        title: `margin:0 0 16px;font-size:28px;font-weight:600;color:${mainText};text-align:center;letter-spacing:-0.02em;`,
        intro: `margin:0 0 32px;font-size:16px;line-height:26px;color:${subText};text-align:center;font-weight:300;`,
        contentBox: `background-color:${contentBoxBg};border-radius:24px;padding:32px;border:${contentBoxBorder};`,
        text: `margin:0 0 16px;font-size:15px;line-height:26px;color:${subText};`,
        buttonContainer: `text-align:center;margin:32px 0;`,
        button: `display:inline-block;padding:16px 36px;background:linear-gradient(135deg, #4ba586 0%, #3d8b6f 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:16px;box-shadow:0 10px 20px -10px rgba(75,165,134,0.5);`,
        footerCell: `padding:32px 40px;background-color:${footerBg};border-top:1px solid rgba(255,255,255,0.05);text-align:center;`,
        footerTextP: `margin:0 0 12px;font-size:12px;line-height:18px;color:${footerText};`,
        footerLink: `color:${footerLink};text-decoration:none;margin:0 8px;`,
        codeBlock: `margin:0 0 24px;`,
        codeInner: `display:inline-block;padding:18px 28px;border-radius:18px;background:linear-gradient(135deg,rgba(75,165,134,0.12),rgba(148,174,161,0.08));border:${containerBorder};`,
        codeSpan: `font-size:28px;letter-spacing:0.4em;color:${mainText};font-weight:600;font-family:monospace;`
    };
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
            web: 'Web Sitesi',
            support: 'Destek',
            privacy: 'Gizlilik'
        },
        requestReceived: {
            subject: 'Talebiniz Alındı',
            title: 'Talebiniz Bize Ulaştı',
            intro: (name) => `Merhaba ${name}, Dripfy Yönetim Paneli için kayıt talebiniz başarıyla alındı. Ekibimiz bilgilerinizi inceledikten sonra size dönüş yapacaktır.`,
        },
        adminMessage: {
            subject: (name) => `[Dripfy] Yeni Mesaj: ${name}`,
            title: 'Yeni Kullanıcı Mesajı',
            intro: (name) => `${name} isimli kullanıcıdan yeni bir mesaj aldınız.`,
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
            web: 'Website',
            support: 'Support',
            privacy: 'Privacy'
        },
        requestReceived: {
            subject: 'Request Received',
            title: 'We Received Your Request',
            intro: (name) => `Hello ${name}, your signup request for Dripfy Admin Panel has been received. Our team will review your details and get back to you shortly.`,
        },
        adminMessage: {
            subject: (name) => `[Dripfy] New Message: ${name}`,
            title: 'New User Message',
            intro: (name) => `You have received a new message from ${name}.`,
        }
    }
};

function getTemplate(lang = 'en') { // Default to 'en' per standards
    return TEXTS[lang] || TEXTS['en'];
}

function buildHtml(title, intro, contentHtml, footerNote, lang = 'en', theme = 'light') {
    const s = buildStyles(theme);
    const t = getTemplate(lang);

    const footerLinks = `
        <div style="font-size:12px;color:rgba(255,255,255,0.3);">
          <a href="https://hasiripi.com" style="${s.footerLink}">${t.footer.web}</a> •
          <a href="mailto:info@dripfy.de" style="${s.footerLink}">${t.footer.support}</a> •
          <a href="#" style="${s.footerLink}">${t.footer.privacy}</a>
        </div>
    `;

    return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
  </style>
</head>
<body style="${s.body}">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${s.outerTable}">
    <tr>
      <td align="center">
        <!-- Glass Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="${s.container}">
          
          <!-- Header with Gradient Line -->
          <tr>
            <td style="padding:0;">
              <div style="${s.headerLine}"></div>
            </td>
          </tr>

          <!-- Logo Area -->
          <tr>
            <td style="${s.logoCell}">
               <img src="https://hasiripi.com/assets/logo-wordmark.png" alt="Dripfy" style="height:40px;border:0;display:block;margin:0 auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="${s.contentCell}">
              <h1 style="${s.title}">${title}</h1>
              <p style="${s.intro}">${intro}</p>
              
              <!-- Content Box -->
              <div style="${s.contentBox}">
                  ${contentHtml}
              </div>

               ${footerNote ? `<div style="text-align:center;margin-top:24px;"><p style="${s.footerTextP}">${footerNote}</p></div>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="${s.footerCell}">
              <p style="${s.footerTextP}">
                ${t.footer.copyright}
              </p>
              ${footerLinks}
            </td>
          </tr>
        </table>
        
        <p style="margin-top:24px;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;">
          Automatic email, do not reply.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendInviteEmail({ email, name, password, position, lang = 'en', theme = 'light' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = getTemplate(lang).inviteParams;

    const s = buildStyles(theme);

    const content = `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:12px;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
      <p style="margin:0 0 16px;font-weight:500;">${email}</p>
      
      <p style="margin:0 0 8px;font-size:12px;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em;">Password</p>
      <p style="margin:0;font-weight:500;font-family:monospace;background:rgba(0,0,0,0.1);padding:8px 12px;border-radius:6px;display:inline-block;">${password}</p>
    </div>
    <p style="${s.text}">Position: ${position}</p>
    <div style="${s.buttonContainer}">
      <a href="https://hasiripi.com/login?invite=true&email=${encodeURIComponent(email)}" style="${s.button}">${t.action}</a>
    </div>
  `;

    const html = buildHtml(t.title, t.intro(name), content, null, lang, theme);

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

export async function sendSignupReceivedEmail({ email, name, lang = 'en', theme = 'light' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = getTemplate(lang).requestReceived;
    const html = buildHtml(t.title, t.intro(name), '', null, lang, theme);

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

    // Admin emails always light or standard, maybe hardcode 'en' 'light' for admin consistency
    const content = `
       ${Object.entries(details).map(([k, v]) => `<p style="margin:4px 0;"><strong>${k}:</strong> <span>${v}</span></p>`).join('')}
    `;

    const html = buildHtml('New Signup Request', 'A new signup request has been received.', content, null, 'en', 'light');

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminRecipient,
            subject: `[Dripfy] New Request: ${name}`,
            html
        });
    } catch (err) {
        console.error('[email-service] Failed to notify admin:', err);
    }
}

export async function sendVerificationCodeEmail({ email, name, code, lang = 'en', theme = 'light' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const t = {
        subject: lang === 'tr' ? 'Dripfy Doğrulama Kodu' : 'Dripfy Verification Code',
        title: lang === 'tr' ? 'Doğrulama Kodunuz' : 'Your Verification Code',
        intro: lang === 'tr'
            ? `Merhaba ${name}, e-posta adresinizi doğrulamak için aşağıdaki kodu kullanın.`
            : `Hello ${name}, use the code below to verify your email address.`,
    };

    const s = buildStyles(theme);
    const content = `
    <div style="${s.codeBlock}">
       <div style="${s.codeInner}">
         <span style="${s.codeSpan}">${code}</span>
       </div>
    </div>
  `;

    const html = buildHtml(t.title, t.intro, content, null, lang, theme);

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

export async function sendAdminMessageEmail({ fromName, fromEmail, content, lang = 'en', theme = 'light' }) {
    if (!transporter) await initEmailService();
    if (!transporter) return false;

    const adminRecipient = 'dripfy@hasiripi.com';
    const t = getTemplate(lang).adminMessage;

    // We use the USER's language and theme preference for the template structure
    // but the content is what they wrote.

    const s = buildStyles(theme);

    const messageHtml = `
        <p style="${s.text}">${content.replace(/\n/g, '<br>')}</p>
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;opacity:0.7;">
            Sent by: <strong>${fromName}</strong> (${fromEmail})
        </div>
    `;

    const html = buildHtml(t.title, t.intro(fromName), messageHtml, null, lang, theme);

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: adminRecipient,
            replyTo: fromEmail,
            subject: t.subject(fromName),
            html
        });
        return true;
    } catch (error) {
        console.error('[email-service] Failed to send admin message email:', error);
        throw error; // Propagate error so we know if it failed
    }
}
