import express from 'express';
import { authenticate } from '../auth/middleware.js';
import { getOkrById, listOkrs, upsertOkr, validateOkr } from '../services/okrService.js';

const router = express.Router();

router.use(authenticate());

router.get('/', async (req, res) => {
  try {
    const { role, department } = req.query;
    const okrs = await listOkrs({
      role: typeof role === 'string' ? role : undefined,
      department: typeof department === 'string' ? department : undefined,
    });

    res.json({ ok: true, okrs });
  } catch (error) {
    console.error('[okr] Failed to list OKRs', error);
    res.status(500).json({ ok: false, error: { message: 'OKR listesi alınamadı.' } });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const okr = await getOkrById(req.params.id);
    if (!okr) {
      return res.status(404).json({ ok: false, error: { message: 'OKR bulunamadı.' } });
    }
    res.json({ ok: true, okr });
  } catch (error) {
    console.error('[okr] Failed to fetch OKR', error);
    res.status(500).json({ ok: false, error: { message: 'OKR alınamadı.' } });
  }
});

router.post('/', async (req, res) => {
  try {
    const record = await upsertOkr(req.body || {}, { actor: req.user });
    res.status(201).json({ ok: true, okr: record });
  } catch (error) {
    const status = error.code === 'VALIDATION_ERROR' ? 400 : 500;
    console.error('[okr] Failed to create OKR', error);
    res.status(status).json({ ok: false, error: { message: error.message || 'OKR oluşturulamadı.' } });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const record = await upsertOkr({ ...req.body, id: req.params.id }, { actor: req.user });
    res.json({ ok: true, okr: record });
  } catch (error) {
    let status = 500;
    if (error.code === 'VALIDATION_ERROR') {
      status = 400;
    }
    console.error('[okr] Failed to update OKR', error);
    res.status(status).json({ ok: false, error: { message: error.message || 'OKR güncellenemedi.' } });
  }
});

router.post('/:id/validate', async (req, res) => {
  try {
    const updated = await validateOkr(req.params.id, {
      validatedBy: req.user?.email || req.user?.name,
      notes: req.body?.notes,
    });
    res.json({ ok: true, okr: updated });
  } catch (error) {
    let status = 500;
    if (error.code === 'NOT_FOUND') {
      status = 404;
    }
    console.error('[okr] Failed to validate OKR', error);
    res.status(status).json({ ok: false, error: { message: error.message || 'OKR doğrulanamadı.' } });
  }
});

export default router;
