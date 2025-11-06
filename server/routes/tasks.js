import express from 'express';
import { authenticate } from '../auth/middleware.js';
import {
  listPersonalTasks,
  createPersonalTask,
  updatePersonalTask,
  TaskVersionConflictError,
} from '../services/taskPlannerService.js';
import { performScheduledSync } from '../services/calendar/index.js';

export const tasksRouter = express.Router();

tasksRouter.use(authenticate());

tasksRouter.get('/personal', async (req, res) => {
  try {
    const tasks = await listPersonalTasks(req.user.id);
    res.json({ ok: true, tasks });
  } catch (error) {
    console.error('[tasks] list personal failed', error);
    res.status(500).json({ ok: false, error: { message: 'Kişisel görevler alınamadı.' } });
  }
});

tasksRouter.post('/personal', async (req, res) => {
  try {
    const task = await createPersonalTask(req.user, req.body || {});
    res.status(201).json({ ok: true, task });
  } catch (error) {
    console.error('[tasks] create personal failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Görev oluşturulamadı.' } });
  }
});

tasksRouter.patch('/personal/:id', async (req, res) => {
  const { id } = req.params;
  const { changes = {}, expectedVersion } = req.body || {};
  const parsedVersion = typeof expectedVersion === 'number' || typeof expectedVersion === 'undefined'
    ? expectedVersion
    : Number(expectedVersion);
  try {
    const task = await updatePersonalTask(req.user, id, changes, Number.isNaN(parsedVersion) ? undefined : parsedVersion);
    res.json({ ok: true, task });
  } catch (error) {
    if (error instanceof TaskVersionConflictError) {
      res.status(409).json({
        ok: false,
        error: {
          code: 'VERSION_CONFLICT',
          message: error.message,
          expected: error.expectedVersion,
          actual: error.actualVersion,
        },
      });
      return;
    }
    console.error('[tasks] update personal failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Görev güncellenemedi.' } });
  }
});

tasksRouter.post('/personal/:id/sync', async (req, res) => {
  const { id } = req.params;
  try {
    await performScheduledSync({ forcedTaskIds: [id] });
    res.json({ ok: true });
  } catch (error) {
    console.error('[tasks] manual sync failed', error);
    res.status(500).json({ ok: false, error: { message: 'Görev senkronizasyonu başlatılamadı.' } });
  }
});

export default tasksRouter;
