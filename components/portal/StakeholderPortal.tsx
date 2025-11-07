import * as React from 'react';
import type { StakeholderPortalState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import PortalStatusTracker from './PortalStatusTracker';
import PortalDocumentManager from './PortalDocumentManager';
import PortalSupportRequestForm from './PortalSupportRequestForm';
import PortalMessagingPanel from './PortalMessagingPanel';
import {
  fetchPortalOverview,
  acknowledgePortalStatus,
  submitPortalSupportRequest,
  sendPortalMessage,
} from '../../services/portalApi';
import {
  createPortalDocument,
  uploadPortalDocumentVersion,
  generatePortalDocumentLink,
  updatePortalDocumentApproval,
} from '../../services/documents';

interface StakeholderPortalProps {
  initialState?: StakeholderPortalState | null;
}

export const StakeholderPortal: React.FC<StakeholderPortalProps> = ({ initialState = null }) => {
  const { token, user, isExternalStakeholder, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [portalState, setPortalState] = React.useState<StakeholderPortalState | null>(initialState);
  const [isLoading, setIsLoading] = React.useState(!initialState);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMessaging, setIsMessaging] = React.useState(false);

  const loadPortalOverview = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await fetchPortalOverview({ token: token || undefined });
      setPortalState(overview);
    } catch (loadError) {
      console.error('[portal] overview load failed', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Portal verileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadPortalOverview().catch(() => undefined);
  }, [loadPortalOverview]);

  const handleAcknowledgeStatus = React.useCallback(
    async (statusId: string) => {
      await acknowledgePortalStatus(statusId, { token: token || undefined });
      await loadPortalOverview();
    },
    [token, loadPortalOverview],
  );

  const handleCreateDocument = React.useCallback(
    async (payload: { title: string; description?: string; category?: string }) => {
      setIsSubmitting(true);
      try {
        await createPortalDocument(payload, { token: token || undefined });
        await loadPortalOverview();
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, loadPortalOverview],
  );

  const handleUploadVersion = React.useCallback(
    async (documentId: string, payload: { fileName: string; notes?: string }) => {
      setIsSubmitting(true);
      try {
        await uploadPortalDocumentVersion(documentId, payload, { token: token || undefined });
        await loadPortalOverview();
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, loadPortalOverview],
  );

  const handleGenerateLink = React.useCallback(
    (documentId: string, versionId: string) =>
      generatePortalDocumentLink(documentId, versionId, undefined, { token: token || undefined }),
    [token],
  );

  const handleApproval = React.useCallback(
    async (documentId: string, status: 'pending' | 'approved' | 'rejected', notes?: string) => {
      await updatePortalDocumentApproval(documentId, { status, notes }, { token: token || undefined });
      await loadPortalOverview();
    },
    [token, loadPortalOverview],
  );

  const handleSupportSubmit = React.useCallback(
    async (payload: { subject: string; message: string; category?: string; priority?: 'low' | 'normal' | 'high' }) => {
      setIsSubmitting(true);
      try {
        await submitPortalSupportRequest(payload, { token: token || undefined });
        await loadPortalOverview();
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, loadPortalOverview],
  );

  const handleSendMessage = React.useCallback(
    async (payload: { body: string }) => {
      setIsMessaging(true);
      try {
        await sendPortalMessage(payload, { token: token || undefined });
        await loadPortalOverview();
      } finally {
        setIsMessaging(false);
      }
    },
    [token, loadPortalOverview],
  );

  const translate = React.useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t],
  );

  if (isLoading && !portalState) {
    return (
      <div className="p-10 text-center text-[var(--drip-muted)] dark:text-neutral-400 animate-pulse">
        {translate('portal.loading', 'Portal verileri yükleniyor...')}
      </div>
    );
  }

  if (!portalState) {
    return (
      <div className="p-10 text-center text-[var(--drip-muted)] dark:text-neutral-400">
        {error || translate('portal.empty', 'Portal verisi bulunamadı.')}<br />
        <button
          onClick={() => loadPortalOverview()}
          className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[var(--drip-primary-dark)]"
        >
          {translate('portal.retry', 'Yeniden Dene')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--drip-text)] dark:text-white">
            {translate('portal.title', 'Paydaş Portalı')}
          </h1>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
            {portalState.profile.company}
            {portalState.profile.contactName ? ` • ${portalState.profile.contactName}` : ''}
          </p>
        </div>
        <div className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
          {translate('portal.usageSummary', 'Toplam etkinlik:')} {portalState.usage.totalEvents} •{' '}
          {translate('portal.lastActivity', 'Son aktivite:')}{' '}
          {portalState.usage.lastActivityAt ? new Date(portalState.usage.lastActivityAt).toLocaleString() : translate('portal.none', 'Yok')}
        </div>
      </div>

      {error && (
        <div className="border border-rose-200 dark:border-rose-500/40 bg-rose-500/10 dark:bg-rose-500/10 text-rose-700 dark:text-rose-100 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PortalStatusTracker
          statuses={portalState.profile.statuses}
          onAcknowledge={handleAcknowledgeStatus}
          isProcessing={isSubmitting}
        />
        <PortalMessagingPanel
          messages={portalState.messages}
          onSend={handleSendMessage}
          isSending={isMessaging}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PortalDocumentManager
          documents={portalState.documents}
          onCreateDocument={handleCreateDocument}
          onUploadVersion={handleUploadVersion}
          onGenerateLink={handleGenerateLink}
          onUpdateApproval={handleApproval}
          isSubmitting={isSubmitting}
          canApprove={isAdmin && !isExternalStakeholder}
        />
        <PortalSupportRequestForm
          requests={portalState.supportRequests}
          onSubmit={handleSupportSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};

export default StakeholderPortal;
