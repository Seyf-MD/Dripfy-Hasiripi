import * as React from 'react';
import { RefreshCcw, Link2, ShieldOff, PlugZap, Check, Loader2 } from 'lucide-react';
import type { CalendarIntegrationAccount } from '../../types';
import {
  fetchIntegrationAccounts,
  startOAuthConnection,
  completeOAuthConnection,
  updateIntegrationPreferencesApi,
  revokeIntegrationAccount,
  triggerIntegrationSync,
} from '../../services/integrations';

interface PendingConnection {
  provider: string;
  state: string;
  redirectUri: string;
}

const DEFAULT_REDIRECT_PATH = '/integrations/callback';

const providerLabels: Record<string, string> = {
  google: 'Google Takvim',
  outlook: 'Outlook Takvim',
};

const IntegrationsSettings: React.FC = () => {
  const [accounts, setAccounts] = React.useState<CalendarIntegrationAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingConnection | null>(null);
  const [authCode, setAuthCode] = React.useState('');
  const [submittingCode, setSubmittingCode] = React.useState(false);
  const [activeIntegrationId, setActiveIntegrationId] = React.useState<string | null>(null);

  const loadAccounts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIntegrationAccounts();
      setAccounts(result);
    } catch (loadError) {
      console.error('[IntegrationsSettings] load failed', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Entegrasyonlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAccounts().catch((loadError) => {
      console.error('[IntegrationsSettings] useEffect failed', loadError);
    });
  }, [loadAccounts]);

  const handleStartOAuth = async (provider: 'google' | 'outlook') => {
    try {
      const redirectUri = `${window.location.origin}${DEFAULT_REDIRECT_PATH}`;
      const scopes = provider === 'google'
        ? ['https://www.googleapis.com/auth/calendar.events']
        : ['https://graph.microsoft.com/Calendars.ReadWrite'];
      const { authUrl, state } = await startOAuthConnection(provider, redirectUri, scopes);
      window.open(authUrl, '_blank', 'noopener');
      setPending({ provider, state, redirectUri });
    } catch (oauthError) {
      console.error('[IntegrationsSettings] start oauth failed', oauthError);
      setError(oauthError instanceof Error ? oauthError.message : 'OAuth başlatılamadı.');
    }
  };

  const handleCompleteOAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pending || !authCode.trim()) {
      return;
    }
    setSubmittingCode(true);
    try {
      const integration = await completeOAuthConnection(
        pending.provider,
        authCode.trim(),
        pending.state,
        pending.redirectUri,
      );
      setAccounts((prev) => [integration, ...prev.filter((item) => item.id !== integration.id)]);
      setPending(null);
      setAuthCode('');
      setError(null);
    } catch (completeError) {
      console.error('[IntegrationsSettings] complete oauth failed', completeError);
      setError(completeError instanceof Error ? completeError.message : 'OAuth tamamlanamadı.');
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleToggleAutoSync = async (account: CalendarIntegrationAccount, value: boolean) => {
    try {
      setActiveIntegrationId(account.id);
      const updated = await updateIntegrationPreferencesApi(account.id, {
        autoSync: value,
      });
      setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (toggleError) {
      console.error('[IntegrationsSettings] toggle auto sync failed', toggleError);
      setError(toggleError instanceof Error ? toggleError.message : 'Tercihler güncellenemedi.');
    } finally {
      setActiveIntegrationId(null);
    }
  };

  const handleSyncWindowChange = async (account: CalendarIntegrationAccount, value: number) => {
    try {
      setActiveIntegrationId(account.id);
      const updated = await updateIntegrationPreferencesApi(account.id, {
        syncWindowDays: value,
      });
      setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (changeError) {
      console.error('[IntegrationsSettings] sync window change failed', changeError);
      setError(changeError instanceof Error ? changeError.message : 'Tercihler güncellenemedi.');
    } finally {
      setActiveIntegrationId(null);
    }
  };

  const handleDefaultReminderChange = async (account: CalendarIntegrationAccount, value: number) => {
    try {
      setActiveIntegrationId(account.id);
      const updated = await updateIntegrationPreferencesApi(account.id, {
        reminderMinutesBefore: value,
      });
      setAccounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setError(null);
    } catch (changeError) {
      console.error('[IntegrationsSettings] reminder change failed', changeError);
      setError(changeError instanceof Error ? changeError.message : 'Tercihler güncellenemedi.');
    } finally {
      setActiveIntegrationId(null);
    }
  };

  const handleManualSync = async (accountId: string) => {
    try {
      setActiveIntegrationId(accountId);
      await triggerIntegrationSync(accountId);
      await loadAccounts();
      setError(null);
    } catch (syncError) {
      console.error('[IntegrationsSettings] manual sync failed', syncError);
      setError(syncError instanceof Error ? syncError.message : 'Senkronizasyon başlatılamadı.');
    } finally {
      setActiveIntegrationId(null);
    }
  };

  const handleRevoke = async (accountId: string) => {
    if (!window.confirm('Bağlantıyı kaldırmak istediğinize emin misiniz?')) {
      return;
    }
    try {
      setActiveIntegrationId(accountId);
      await revokeIntegrationAccount(accountId);
      setAccounts((prev) => prev.filter((item) => item.id !== accountId));
      setError(null);
    } catch (revokeError) {
      console.error('[IntegrationsSettings] revoke failed', revokeError);
      setError(revokeError instanceof Error ? revokeError.message : 'Bağlantı kaldırılamadı.');
    } finally {
      setActiveIntegrationId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Takvim Entegrasyonları</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          Google ve Outlook takvimlerinizi bağlayarak kişisel planlayıcıyla otomatik senkronizasyon yapabilirsiniz.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200">
          <ShieldOff size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleStartOAuth('google')}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Link2 size={16} /> Google Takvim hesabı bağla
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Yetkilendirme bağlantısı yeni sekmede açılır. Onayladıktan sonra buraya dönüş kodunu girebilirsiniz.
          </p>
        </button>
        <button
          type="button"
          onClick={() => handleStartOAuth('outlook')}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Link2 size={16} /> Outlook Takvim hesabı bağla
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Microsoft hesabınızı bağlayarak Outlook takvim olaylarını içe aktarabilirsiniz.
          </p>
        </button>
      </div>

      {pending && (
        <form onSubmit={handleCompleteOAuth} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm shadow-sm dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100">
          <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-100">
            <PlugZap size={16} /> Yetkilendirme kodunu girin
          </div>
          <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-100/80">
            {providerLabels[pending.provider] || pending.provider} hesabı için OAuth bağlantısı başlatıldı. Tarayıcıda açılan sayfadaki kodu bu alana yapıştırın.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={authCode}
              onChange={(event) => setAuthCode(event.target.value)}
              placeholder="Authorization code"
              className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-500/60 dark:bg-emerald-900/40 dark:text-emerald-50"
            />
            <button
              type="submit"
              disabled={submittingCode || !authCode.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submittingCode ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {submittingCode ? 'Bağlanıyor…' : 'Tamamla'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading && accounts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-neutral-400">
            <Loader2 size={16} className="animate-spin" /> Hesaplar yükleniyor…
          </div>
        )}
        {accounts.map((account) => (
          <div
            key={account.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white">
                  {providerLabels[account.provider] || account.provider}
                </div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">{account.accountEmail}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                  Son senkronizasyon: {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleManualSync(account.id)}
                  disabled={activeIntegrationId === account.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  {activeIntegrationId === account.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Senkronize Et
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(account.id)}
                  disabled={activeIntegrationId === account.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/60 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  <ShieldOff size={14} />
                  Kaldır
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span>Otomatik senkronizasyon</span>
                <button
                  type="button"
                  onClick={() => handleToggleAutoSync(account, !account.preferences.autoSync)}
                  disabled={activeIntegrationId === account.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${account.preferences.autoSync ? 'bg-emerald-500' : 'bg-slate-300'} ${activeIntegrationId === account.id ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${account.preferences.autoSync ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </label>
              <label className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span>Senkronizasyon penceresi (gün)</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={account.preferences.syncWindowDays}
                  onChange={(event) => handleSyncWindowChange(account, Number(event.target.value))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </label>
              <label className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span>Varsayılan hatırlatıcı (dakika)</span>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={account.preferences.reminderMinutesBefore}
                  onChange={(event) => handleDefaultReminderChange(account, Number(event.target.value))}
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
                />
              </label>
            </div>
          </div>
        ))}

        {!loading && accounts.length === 0 && !pending && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            Henüz bağlı takvim hesabı bulunmuyor. Yukarıdaki butonlardan yeni bir entegrasyon ekleyebilirsiniz.
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationsSettings;
