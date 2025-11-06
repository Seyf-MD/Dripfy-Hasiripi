import express from 'express';
import { authenticate } from '../auth/middleware.js';
import {
  buildAuthUrl,
  completeOAuth,
  createOAuthState,
  consumeOAuthState,
  listIntegrations,
  updateIntegrationPreferences,
  revokeIntegration,
  fetchCalendarSnapshot,
  triggerImmediateSync,
  performScheduledSync,
} from '../services/calendar/index.js';

export const integrationsRouter = express.Router();

integrationsRouter.use(authenticate());

integrationsRouter.post('/oauth/start', async (req, res) => {
  const { provider, redirectUri, scopes, prompt } = req.body || {};
  if (!provider || !redirectUri) {
    return res.status(400).json({ ok: false, error: { message: 'Sağlayıcı ve yönlendirme adresi zorunludur.' } });
  }
  try {
    const state = createOAuthState({ userId: req.user.id, provider, redirectUri });
    const authUrl = await buildAuthUrl({ provider, state, redirectUri, scopes, prompt });
    res.json({ ok: true, authUrl, state });
  } catch (error) {
    console.error('[integrations] oauth start failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Yetkilendirme başlatılamadı.' } });
  }
});

integrationsRouter.post('/oauth/complete', async (req, res) => {
  const { provider, code, state, redirectUri } = req.body || {};
  if (!provider || !code || !state) {
    return res.status(400).json({ ok: false, error: { message: 'Eksik OAuth parametreleri.' } });
  }
  const storedState = consumeOAuthState(state);
  if (!storedState) {
    return res.status(400).json({ ok: false, error: { message: 'Geçersiz veya süresi geçmiş OAuth isteği.' } });
  }
  if (storedState.userId !== req.user.id) {
    return res.status(403).json({ ok: false, error: { message: 'Bu OAuth isteğini tamamlama yetkiniz yok.' } });
  }
  try {
    const integration = await completeOAuth({
      userId: req.user.id,
      provider,
      code,
      redirectUri: redirectUri || storedState.redirectUri,
    });
    res.status(201).json({ ok: true, integration });
  } catch (error) {
    console.error('[integrations] oauth complete failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Bağlantı tamamlanamadı.' } });
  }
});

integrationsRouter.get('/accounts', async (req, res) => {
  try {
    const accounts = await listIntegrations(req.user.id);
    res.json({ ok: true, accounts });
  } catch (error) {
    console.error('[integrations] list accounts failed', error);
    res.status(500).json({ ok: false, error: { message: 'Hesaplar alınamadı.' } });
  }
});

integrationsRouter.patch('/accounts/:id/preferences', async (req, res) => {
  const { id } = req.params;
  const { preferences } = req.body || {};
  try {
    const account = await updateIntegrationPreferences(req.user.id, id, preferences || {});
    res.json({ ok: true, account });
  } catch (error) {
    console.error('[integrations] update preferences failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Tercihler güncellenemedi.' } });
  }
});

integrationsRouter.delete('/accounts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const account = await revokeIntegration(req.user.id, id);
    res.json({ ok: true, account });
  } catch (error) {
    console.error('[integrations] revoke failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Bağlantı kaldırılamadı.' } });
  }
});

integrationsRouter.post('/accounts/:id/sync', async (req, res) => {
  const { id } = req.params;
  try {
    const account = await triggerImmediateSync(id);
    await performScheduledSync({});
    res.json({ ok: true, account });
  } catch (error) {
    console.error('[integrations] manual sync failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Senkronizasyon başlatılamadı.' } });
  }
});

integrationsRouter.get('/calendar/events', async (req, res) => {
  const { rangeStart, rangeEnd } = req.query || {};
  try {
    const events = await fetchCalendarSnapshot(req.user.id, {
      rangeStart: rangeStart || undefined,
      rangeEnd: rangeEnd || undefined,
    });
    res.json({ ok: true, events });
  } catch (error) {
    console.error('[integrations] calendar snapshot failed', error);
    res.status(400).json({ ok: false, error: { message: error.message || 'Takvim verileri alınamadı.' } });
  }
});

export default integrationsRouter;
