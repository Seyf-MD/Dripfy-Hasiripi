import express from 'express';
import { authenticate } from '../auth/middleware.js';
import {
  createPortalInvitation,
  listPortalInvitations,
  acceptPortalInvitation,
  getPortalOverviewForUser,
  sanitizePortalOverview,
  acknowledgePortalStatus,
  createSupportRequest,
  postPortalMessage,
  registerPortalDocument,
  appendDocumentVersion,
  generateSecureDocumentLink,
  updateDocumentApproval,
  getPortalOverviewForAdmin,
  listPortalProfiles,
} from '../services/stakeholderPortalService.js';

const portalRouter = express.Router();

portalRouter.post(
  '/invitations',
  authenticate({ requiredRole: 'admin' }),
  async (req, res) => {
    try {
      const { email, name, company, scopes, expiresInHours, message } = req.body || {};
      const result = await createPortalInvitation({
        email,
        name,
        company,
        invitedBy: req.user,
        scopes: Array.isArray(scopes) ? scopes : [],
        expiresInHours: Number.isFinite(Number(expiresInHours)) ? Number(expiresInHours) : undefined,
        message,
      });
      res.status(201).json({ ok: true, invitation: result.invitation, token: result.token, profile: result.profile });
    } catch (error) {
      console.error('[portal] create invitation failed', error);
      res.status(400).json({ ok: false, error: { message: error.message || 'Davetiye oluşturulamadı' } });
    }
  },
);

portalRouter.get(
  '/invitations',
  authenticate({ requiredRole: 'admin' }),
  async (_req, res) => {
    try {
      const invitations = await listPortalInvitations();
      res.json({ ok: true, invitations });
    } catch (error) {
      console.error('[portal] list invitations failed', error);
      res.status(500).json({ ok: false, error: { message: 'Davetiye listesi alınamadı' } });
    }
  },
);

portalRouter.post('/invitations/accept', async (req, res) => {
  try {
    const { token, password, name } = req.body || {};
    const result = await acceptPortalInvitation({ token, password, name });
    res.status(201).json({ ok: true, user: result.user, profile: result.profile });
  } catch (error) {
    console.error('[portal] accept invitation failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Davetiye kabul edilemedi' } });
  }
});

async function ensurePortalOverview(req, options = {}) {
  const role = req.user?.role;
  if (role === 'admin') {
    if (options.profileId) {
      return getPortalOverviewForAdmin(options.profileId);
    }
    const profiles = await listPortalProfiles();
    if (profiles.length > 0) {
      return getPortalOverviewForAdmin(profiles[0].id);
    }
    return null;
  }
  return getPortalOverviewForUser(req.user?.id);
}

portalRouter.get('/overview', authenticate(), async (req, res) => {
  try {
    const profileId = typeof req.query?.profileId === 'string' ? req.query.profileId : undefined;
    const overview = await ensurePortalOverview(req, { profileId });
    res.json({ ok: true, overview: sanitizePortalOverview(overview) });
  } catch (error) {
    console.error('[portal] overview failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Portal durumu alınamadı' } });
  }
});

portalRouter.post('/status/:statusId/acknowledge', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const status = await acknowledgePortalStatus({
      profileId: overview.profile.id,
      statusId: req.params.statusId,
      actor: req.user,
    });
    res.json({ ok: true, status });
  } catch (error) {
    console.error('[portal] acknowledge status failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Durum güncellenemedi' } });
  }
});

portalRouter.post('/support', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const request = await createSupportRequest({
      profileId: overview.profile.id,
      payload: req.body || {},
      actor: req.user,
    });
    res.status(201).json({ ok: true, request });
  } catch (error) {
    console.error('[portal] support request failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Destek talebi oluşturulamadı' } });
  }
});

portalRouter.post('/messages', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const message = await postPortalMessage({
      profileId: overview.profile.id,
      payload: req.body || {},
      actor: req.user,
    });
    res.status(201).json({ ok: true, message });
  } catch (error) {
    console.error('[portal] post message failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Mesaj gönderilemedi' } });
  }
});

portalRouter.post('/documents', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const document = await registerPortalDocument({
      profileId: overview.profile.id,
      payload: req.body || {},
      actor: req.user,
    });
    res.status(201).json({ ok: true, document });
  } catch (error) {
    console.error('[portal] create document failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Belge kaydedilemedi' } });
  }
});

portalRouter.post('/documents/:documentId/versions', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const version = await appendDocumentVersion({
      profileId: overview.profile.id,
      documentId: req.params.documentId,
      payload: req.body || {},
      actor: req.user,
    });
    res.status(201).json({ ok: true, version });
  } catch (error) {
    console.error('[portal] append document version failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Belge sürümü eklenemedi' } });
  }
});

portalRouter.post('/documents/:documentId/secure-link', authenticate(), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const result = await generateSecureDocumentLink({
      profileId: overview.profile.id,
      documentId: req.params.documentId,
      versionId: req.body?.versionId,
      actor: req.user,
      expiresInMinutes: req.body?.expiresInMinutes,
    });
    res.status(201).json({ ok: true, link: result });
  } catch (error) {
    console.error('[portal] generate secure link failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Güvenli bağlantı oluşturulamadı' } });
  }
});

portalRouter.post('/documents/:documentId/approval', authenticate({ requiredRole: 'approver' }), async (req, res) => {
  try {
    const overview = await ensurePortalOverview(req);
    if (!overview || !overview.profile) {
      return res.status(404).json({ ok: false, error: { message: 'Portal profili bulunamadı' } });
    }
    const approval = await updateDocumentApproval({
      profileId: overview.profile.id,
      documentId: req.params.documentId,
      payload: req.body || {},
      actor: req.user,
    });
    res.status(200).json({ ok: true, approval });
  } catch (error) {
    console.error('[portal] update approval failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Belge onayı güncellenemedi' } });
  }
});

export default portalRouter;

