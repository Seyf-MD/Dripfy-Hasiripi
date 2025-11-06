import express from 'express';
import { generateChatResponse, listKnowledgeBaseSources } from '../services/chatbotService.js';
import { createTask, updateRecord, triggerReport } from '../services/automationService.js';
import { automationConfig } from '../config/index.js';

export const automationRouter = express.Router();

automationRouter.get('/knowledge-sources', async (_req, res) => {
  try {
    const sources = await listKnowledgeBaseSources();
    res.json({ ok: true, sources });
  } catch (error) {
    console.error('[automation] knowledge-sources failed', error);
    res.status(500).json({ ok: false, error: { message: 'Bilgi tabanı kaynakları alınamadı.' } });
  }
});

automationRouter.get('/permissions', (_req, res) => {
  res.json({ ok: true, permissions: automationConfig.permissions });
});

automationRouter.post('/chat', async (req, res) => {
  const { prompt, sources = [], conversation = [], template = null, dashboardContext = null } = req.body || {};

  try {
    const response = await generateChatResponse({
      prompt,
      sources,
      previousMessages: conversation,
      template,
      dashboardContext,
    });

    res.json({ ok: true, ...response });
  } catch (error) {
    const errorCode = error?.code || 'CHATBOT_ERROR';
    const retryAfterSeconds = error?.meta?.retryAfterSeconds;
    const statusCode = errorCode === 'USAGE_LIMIT_EXCEEDED'
      ? 429
      : errorCode === 'OPENAI_NOT_CONFIGURED'
        ? 503
        : errorCode === 'OPENAI_TIMEOUT'
          ? 504
          : 400;

    if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)) {
      res.set('Retry-After', Math.max(1, Math.round(retryAfterSeconds)).toString());
    }

    console.error('[automation] chat failed', errorCode, error?.message);
    res.status(statusCode).json({
      ok: false,
      error: {
        message: error?.message || 'Yanıt oluşturulamadı.',
        code: errorCode,
        retryAfterSeconds: typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
          ? Math.max(0, Math.round(retryAfterSeconds))
          : null,
      },
    });
  }
});

automationRouter.post('/tasks', async (req, res) => {
  const { title, description, assignee, priority, dueDate } = req.body || {};
  const actor = req.user || null;

  try {
    const task = await createTask({ title, description, assignee, priority, dueDate, actor });
    res.status(201).json({ ok: true, task });
  } catch (error) {
    console.error('[automation] create task failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Görev oluşturulamadı.' } });
  }
});

automationRouter.patch('/records/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const { changes } = req.body || {};
  const actor = req.user || null;

  try {
    const record = await updateRecord({ collection, recordId: id, changes, actor });
    res.json({ ok: true, record });
  } catch (error) {
    console.error('[automation] update record failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Kayıt güncellenemedi.' } });
  }
});

automationRouter.post('/reports/trigger', async (req, res) => {
  const { reportType, parameters, notes } = req.body || {};
  const actor = req.user || null;

  try {
    const report = await triggerReport({ reportType, parameters, notes, actor });
    res.status(201).json({ ok: true, report });
  } catch (error) {
    console.error('[automation] trigger report failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Rapor tetiklenemedi.' } });
  }
});

export default automationRouter;
