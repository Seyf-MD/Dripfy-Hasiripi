import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { getAuditFilterOptions, searchAuditLogs } from '../services/logService.js';

const router = express.Router();

router.use(authenticate({ requiredRole: 'admin' }));

router.get('/logs', async (req, res) => {
  const {
    startDate = null,
    endDate = null,
    user = null,
    action = null,
    label = null,
    sourceModule = null,
    criticality = null,
    cursor = null,
    limit = null,
  } = req.query || {};

  try {
    const result = await searchAuditLogs({
      startDate: startDate as string | null,
      endDate: endDate as string | null,
      user: user as string | null,
      action: action as string | null,
      label: label as string | null,
      sourceModule: sourceModule as string | null,
      criticality: criticality as string | null,
      cursor: cursor as string | null,
      limit: limit as string | number | null,
    });
    const filters = await getAuditFilterOptions();
    res.json({ ok: true, ...result, filters });
  } catch (error) {
    console.error('[audit] Failed to load audit logs:', error);
    res.status(500).json({ ok: false, error: 'Audit logs could not be loaded' });
  }
});

export default router;
