import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { getAuditFilterOptions, searchAuditLogs } from '../services/logService.js';

type SearchAuditLogsOptions = {
  startDate?: string | null;
  endDate?: string | null;
  user?: string | null;
  action?: string | null;
  label?: string | null;
  sourceModule?: string | null;
  criticality?: string | null;
  cursor?: string | null;
  limit?: number;
};

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
    const parsedLimit = typeof limit === 'string' ? Number.parseInt(limit, 10) : limit;
    const numericLimit = typeof parsedLimit === 'number' && Number.isFinite(parsedLimit) ? parsedLimit : undefined;

    const options: SearchAuditLogsOptions = {
      startDate: startDate as string | null,
      endDate: endDate as string | null,
      user: user as string | null,
      action: action as string | null,
      label: label as string | null,
      sourceModule: sourceModule as string | null,
      criticality: criticality as string | null,
      cursor: cursor as string | null,
      limit: numericLimit,
    };
    const result = await (searchAuditLogs as unknown as (
      params: SearchAuditLogsOptions
    ) => Promise<Awaited<ReturnType<typeof searchAuditLogs>>>)(options);
    const filters = await getAuditFilterOptions();
    res.json({ ok: true, ...result, filters });
  } catch (error) {
    console.error('[audit] Failed to load audit logs:', error);
    res.status(500).json({ ok: false, error: 'Audit logs could not be loaded' });
  }
});

export default router;
