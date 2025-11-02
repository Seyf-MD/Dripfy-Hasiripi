import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { listApprovalFlows, recordApprovalDecision } from '../services/approvalService.js';

const router = express.Router();

router.use(authenticate());

router.get('/flows', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : null;
  const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : null;

  try {
    const flows = await listApprovalFlows({ type, entityId });
    res.json({ ok: true, flows });
  } catch (error) {
    console.error('[approvals] Failed to list approval flows:', error);
    res.status(500).json({ ok: false, error: 'Approval flows could not be loaded' });
  }
});

router.post('/flows/:flowType/:entityId/steps/:stepId/decision', async (req, res) => {
  const { flowType, entityId, stepId } = req.params;
  const decision = typeof req.body?.decision === 'string' ? req.body.decision.trim().toLowerCase() : '';
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

  if (!decision) {
    return res.status(400).json({ ok: false, error: 'Decision is required' });
  }

  try {
    const result = await recordApprovalDecision({
      flowType,
      entityId,
      stepId,
      decision,
      comment,
      actor: req.user,
    });
    res.json({ ok: true, flow: result.flow, decision: result.decision });
  } catch (error) {
    console.error('[approvals] Failed to record decision:', error);
    const statusMap = {
      FLOW_NOT_FOUND: 404,
      STEP_NOT_FOUND: 404,
      STEP_NOT_ACTIONABLE: 409,
      STEP_FORBIDDEN: 403,
      INVALID_DECISION: 400,
    };
    const status = statusMap[error.code] || 500;
    res.status(status).json({ ok: false, error: error.message || 'Decision could not be recorded' });
  }
});

export default router;
