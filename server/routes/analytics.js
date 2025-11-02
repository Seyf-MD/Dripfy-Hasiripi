import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { getKpiOverview } from '../services/analyticsService.js';

const router = express.Router();

router.use(authenticate());

router.get('/kpi', async (req, res) => {
  try {
    const { role, department } = req.query;
    const overview = await getKpiOverview({
      role: typeof role === 'string' ? role : undefined,
      department: typeof department === 'string' ? department : undefined,
    });
    res.json({ ok: true, ...overview });
  } catch (error) {
    console.error('[analytics] Failed to calculate KPI overview', error);
    res.status(500).json({ ok: false, error: { message: 'KPI verileri alınamadı.' } });
  }
});

export default router;
