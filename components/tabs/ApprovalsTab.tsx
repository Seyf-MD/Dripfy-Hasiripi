import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { ApprovalFlowSummary, UserRole } from '../../types';
import ApprovalFlow from '../approvals/ApprovalFlow';
import { useLanguage } from '../../i18n/LanguageContext';

interface ApprovalsTabProps {
  flows: ApprovalFlowSummary[];
  onDecision: (flowId: string, stepId: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  onRefresh: () => void;
  currentUserRole: UserRole | null;
  isLoading: boolean;
}

const ApprovalsTab: React.FC<ApprovalsTabProps> = ({ flows, onDecision, onRefresh, currentUserRole, isLoading }) => {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--drip-text)] dark:text-white">{t('approvals.title')}</h2>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('approvals.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium text-[var(--drip-text)] dark:text-neutral-100 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {t('approvals.refresh')}
        </button>
      </header>

      {flows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 text-center text-sm text-[var(--drip-muted)] dark:text-neutral-400">
          {t('approvals.emptyState')}
        </div>
      ) : (
        <div className="space-y-6">
          {flows.map((flow) => (
            <ApprovalFlow key={flow.id} flow={flow} currentUserRole={currentUserRole} onDecision={onDecision} isProcessing={isLoading} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ApprovalsTab;
