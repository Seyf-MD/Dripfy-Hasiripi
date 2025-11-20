import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendEmailNotification, sendWebPushNotification } from '../notificationService.js';

const QUEUE_NAME = 'task-sla-monitor';
let connection = null;
let queue = null;
let worker = null;
const fallbackTimers = new Map();

function buildConnection() {
  if (connection) {
    return connection;
  }
  const redisUrl = process.env.REDIS_URL || process.env.BULLMQ_REDIS_URL;
  if (!redisUrl) {
    return null;
  }
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  connection.on('error', (error) => {
    console.error('[sla-timer] Redis connection error', error);
  });
  return connection;
}

function ensureQueue() {
  if (queue) {
    return queue;
  }
  const redisConnection = buildConnection();
  if (!redisConnection) {
    return null;
  }
  queue = new Queue(QUEUE_NAME, { connection: redisConnection });
  return queue;
}

async function processSlaBreach({ task, sla }) {
  if (!task || !sla) {
    return;
  }
  const subject = `[SLA] ${task.title || task.id} süresi aşıldı`;
  const message = `Görev "${task.title}" (${task.id}) için tanımlanan "${sla.name}" SLA süresi aşıldı.`;
  const notifyChannels = sla.escalation?.notifyChannels || ['email'];
  const notificationTasks = [];

  if (notifyChannels.includes('email') && typeof task.assignee === 'string' && task.assignee.includes('@')) {
    notificationTasks.push(
      sendEmailNotification({
        to: task.assignee,
        subject,
        text: `${message}\nGörevi yeniden atamak için yöneticiyle iletişime geçin.`,
      }),
    );
  }
  if (notifyChannels.includes('push') && task.assigneeId) {
    notificationTasks.push(
      sendWebPushNotification({
        userId: task.assigneeId,
        title: subject,
        body: message,
        data: { taskId: task.id, slaId: sla.id },
      }),
    );
  }

  if (notifyChannels.includes('slack')) {
    console.info('[sla-timer] Slack bildirimi gönderilecek', { taskId: task.id, slaId: sla.id });
  }

  if (sla.escalation?.reassignment?.assigneeName) {
    console.info('[sla-timer] Reassignment suggested', {
      taskId: task.id,
      reassignment: sla.escalation.reassignment,
    });
  }

  await Promise.allSettled(notificationTasks);
}

async function handleJob(job) {
  try {
    const { task, sla } = job.data || {};
    await processSlaBreach({ task, sla });
  } catch (error) {
    console.error('[sla-timer] Job processing failed', error);
    throw error;
  }
}

export async function startTaskSLATimers() {
  const queueInstance = ensureQueue();
  if (!queueInstance) {
    console.warn('[sla-timer] Redis bağlantısı bulunamadı. SLA zamanlayıcıları bellek üzerinde takip edilecek.');
    return;
  }
  if (worker) {
    return;
  }
  worker = new Worker(QUEUE_NAME, handleJob, {
    connection,
  });
  worker.on('failed', (job, error) => {
    console.error('[sla-timer] Worker failed', { jobId: job?.id, error });
  });
  worker.on('completed', (job) => {
    console.info('[sla-timer] SLA job completed', { jobId: job.id });
  });
}

function scheduleFallback(task, sla, delay) {
  if (fallbackTimers.has(task.id)) {
    clearTimeout(fallbackTimers.get(task.id));
  }
  const timerId = setTimeout(() => {
    fallbackTimers.delete(task.id);
    processSlaBreach({ task, sla }).catch((error) => {
      console.error('[sla-timer] fallback handler failed', error);
    });
  }, Math.max(delay, 0));
  fallbackTimers.set(task.id, timerId);
}

export async function registerTaskForSLAMonitoring(task) {
  if (!task || !task.sla || !task.sla.dueAt || task.status === 'Done') {
    return;
  }
  const dueDate = new Date(task.sla.dueAt);
  const delay = dueDate.getTime() - Date.now();
  const queueInstance = ensureQueue();
  const jobId = `task-sla-${task.id}`;

  if (queueInstance) {
    try {
      await queueInstance.add(
        'sla-check',
        { task, sla: task.sla },
        {
          delay: Math.max(delay, 0),
          jobId,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (error) {
      console.error('[sla-timer] Failed to schedule SLA in queue', error);
      scheduleFallback(task, task.sla, delay);
    }
  } else {
    scheduleFallback(task, task.sla, delay);
  }

  if (delay <= 0) {
    await processSlaBreach({ task, sla: task.sla });
  }
}

export async function clearTaskSLATimer(taskId) {
  if (!taskId) {
    return;
  }
  const queueInstance = ensureQueue();
  const jobId = `task-sla-${taskId}`;
  if (queueInstance) {
    await queueInstance.remove(jobId).catch(() => {});
  }
  if (fallbackTimers.has(taskId)) {
    clearTimeout(fallbackTimers.get(taskId));
    fallbackTimers.delete(taskId);
  }
}

export async function updateTaskSLAMonitoring(task) {
  if (!task || !task.id) {
    return;
  }
  await clearTaskSLATimer(task.id);
  if (task.sla && task.status !== 'Done') {
    await registerTaskForSLAMonitoring(task);
  }
}
