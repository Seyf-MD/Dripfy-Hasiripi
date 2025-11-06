import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { getUsageSummary, listUsageEvents, recordUsageEvent } from '../services/usageService.js';

export const usageRouter = express.Router();

usageRouter.use(authenticate({ requiredRole: 'manager' }));

usageRouter.get('/summary', async (req, res) => {
  try {
    const windowDays = Number(req.query.windowDays) || 30;
    const summary = await getUsageSummary({ windowDays });
    res.json(summary);
  } catch (error) {
    console.error('[usage] summary failed', error);
    res.status(500).json({ ok: false, error: { message: 'Kullanım özeti alınamadı.' } });
  }
});

usageRouter.get('/events', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const events = await listUsageEvents({ limit });
    res.json({ ok: true, events });
  } catch (error) {
    console.error('[usage] list events failed', error);
    res.status(500).json({ ok: false, error: { message: 'Kullanım kayıtları alınamadı.' } });
  }
});

usageRouter.post('/', async (req, res) => {
  try {
    const event = await recordUsageEvent(req.body || {});
    res.status(201).json({ ok: true, event });
  } catch (error) {
    console.error('[usage] record event failed', error);
    res.status(400).json({ ok: false, error: { message: 'Kullanım kaydı oluşturulamadı.' } });
  }
});

export default usageRouter;
