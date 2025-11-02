import nodemailer from 'nodemailer';

let emailTransporter = null;
const webPushQueue = [];

function ensureTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  emailTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return emailTransporter;
}

export async function sendEmailNotification({ to, subject, text }) {
  const transporter = ensureTransporter();
  if (!transporter || !to) {
    console.info('[notifications] Email transporter missing or no recipient', { to, subject });
    return false;
  }

  try {
    await transporter.sendMail({
      to,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error('[notifications] Failed to send e-mail notification', error);
    return false;
  }
}

export async function sendWebPushNotification({ userId, title, body, data }) {
  const payload = {
    id: userId,
    title,
    body,
    data,
    timestamp: new Date().toISOString(),
  };
  webPushQueue.push(payload);
  console.info('[notifications] Queued web push notification', payload);
  return true;
}

export function getPendingWebPushNotifications() {
  return webPushQueue.slice();
}

function buildStepNotificationMessage(flow, step) {
  const title = `[Onay] ${flow.title} - ${step.label}`;
  const dueInfo = step.slaDeadline ? `Son tarih: ${new Date(step.slaDeadline).toLocaleString()}` : 'Son tarih belirlenmedi';
  const body = `Yeni bir onay adımı sizi bekliyor. Akış: ${flow.title}. ${dueInfo}.`;
  return { title, body };
}

export async function notifyApprovalStepPending({ flow, step }) {
  if (!step || !Array.isArray(step.pendingUsers) || step.pendingUsers.length === 0) {
    return;
  }

  const channels = step.notifications && step.notifications.length > 0 ? step.notifications : ['email'];
  const { title, body } = buildStepNotificationMessage(flow, step);

  await Promise.all(
    step.pendingUsers.map(async (user) => {
      const tasks = [];
      if (channels.includes('email')) {
        tasks.push(
          sendEmailNotification({
            to: user.email,
            subject: title,
            text: `${body}\nBağlantı: ${process.env.APP_BASE_URL || 'https://app.dripfy.local'}/approvals`,
          }),
        );
      }
      if (channels.includes('push')) {
        tasks.push(
          sendWebPushNotification({
            userId: user.id,
            title,
            body,
            data: {
              flowId: flow.id,
              stepId: step.id,
            },
          }),
        );
      }
      await Promise.all(tasks);
    }),
  );
}
