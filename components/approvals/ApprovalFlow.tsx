import * as React from 'react';
import { AlarmClock, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { ApprovalFlowSummary, ApprovalStep, ApprovalStepStatus, ApprovalUserSummary, UserRole, isRoleAtLeast } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface ApprovalFlowProps {
  flow: ApprovalFlowSummary;
  currentUserRole: UserRole | null;
  onDecision: (flowId: string, stepId: string, decision: 'approved' | 'rejected', comment?: string) => Promise<void>;
  isProcessing?: boolean;
}

function formatRelativeTime(value: number, locale: string) {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(value);
  if (abs < 60) {
    return formatter.format(Math.round(value), 'seconds');
  }
  if (abs < 3600) {
    return formatter.format(Math.round(value / 60), 'minutes');
  }
  if (abs < 86400) {
    return formatter.format(Math.round(value / 3600), 'hours');
  }
  return formatter.format(Math.round(value / 86400), 'days');
}

function StepStatusBadge({ status, label }: { status: ApprovalStepStatus; label: string }) {
  const styles: Record<ApprovalStepStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/40',
    waiting: 'bg-slate-200 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 border border-transparent',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40',
    rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/40',
    skipped: 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-transparent',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {label || status}
    </span>
  );
}

function PendingUserList({
  users,
  emptyMessage,
  formatRole,
}: {
  users: ApprovalUserSummary[];
  emptyMessage: string;
  formatRole: (role: UserRole) => string;
}) {
  if (!users.length) {
    return <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user) => (
        <span
          key={user.id}
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-neutral-800 px-3 py-1 text-xs text-[var(--drip-text)] dark:text-neutral-200"
        >
          <UserCheck size={14} />
          <span>{user.name}</span>
          <span className="text-[var(--drip-muted)] dark:text-neutral-400">({formatRole(user.role)})</span>
        </span>
      ))}
    </div>
  );
}

function StepCard({
  step,
  language,
  currentUserRole,
  onDecision,
  disabled,
  currentTime,
  t,
}: {
  step: ApprovalStep;
  language: string;
  currentUserRole: UserRole | null;
  onDecision: (decision: 'approved' | 'rejected', comment?: string) => void;
  disabled: boolean;
  currentTime: number;
  t: (key: string) => string;
}) {
  const [comment, setComment] = React.useState('');
  const [showComment, setShowComment] = React.useState(false);
  const isActionable = step.status === 'pending' && currentUserRole ? isRoleAtLeast(currentUserRole, step.requiredRole) : false;
  const deadline = step.slaDeadline ? new Date(step.slaDeadline).getTime() : null;
  const remainingSeconds = deadline ? Math.floor((deadline - currentTime) / 1000) : step.slaSecondsRemaining;
  const deadlineText = deadline ? new Date(deadline).toLocaleString(language) : null;

  React.useEffect(() => {
    if (step.status !== 'pending') {
      setComment('');
    }
  }, [step.status]);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    try {
      await onDecision(decision, comment.trim() ? comment.trim() : undefined);
      setComment('');
      setShowComment(false);
    } catch (error) {
      console.error('Approval decision failed:', error);
      window.alert(t('approvals.step.decisionFailed'));
    }
  };

  const roleLabel = (role: UserRole) => t(`userRoles.${role}`);
  const statusLabel = t(`approvals.status.${step.status}`);

  let slaMessage: string;
  if (typeof remainingSeconds === 'number' && Number.isFinite(remainingSeconds)) {
    const relative = formatRelativeTime(remainingSeconds, language);
    const key = remainingSeconds >= 0 ? 'approvals.step.sla.remaining' : 'approvals.step.sla.overdue';
    slaMessage = t(key).replace('{time}', relative);
  } else if (deadlineText) {
    slaMessage = t('approvals.step.sla.due').replace('{time}', deadlineText);
  } else {
    slaMessage = t('approvals.step.sla.none');
  }

  const actorLabel = step.decidedBy
    ? t('approvals.step.actor')
        .replace('{name}', step.decidedBy)
        .replace('{timestamp}', step.decidedAt ? new Date(step.decidedAt).toLocaleString(language) : '—')
    : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[var(--drip-text)] dark:text-white">{step.label}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={14} />
              {roleLabel(step.requiredRole)}
            </span>
            {step.escalatesTo && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock size={14} /> {t('approvals.step.escalation')}: {roleLabel(step.escalatesTo)}
              </span>
            )}
          </div>
        </div>
        <StepStatusBadge status={step.status} label={statusLabel} />
      </div>

      {step.status === 'pending' && (
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-[var(--drip-muted)] dark:text-neutral-400">
            <AlarmClock size={16} />
            <span>{slaMessage}</span>
          </div>
          <PendingUserList
            users={step.pendingUsers}
            emptyMessage={t('approvals.step.noAssignees')}
            formatRole={roleLabel}
          />
          {isActionable ? (
            <div className="mt-2 space-y-2">
              {showComment && (
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 text-sm text-[var(--drip-text)] dark:text-neutral-100"
                  placeholder={t('approvals.step.commentPlaceholder')}
                  disabled={disabled}
                  rows={2}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDecision('approved')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {t('approvals.step.actions.approve')}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDecision('rejected')}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {t('approvals.step.actions.reject')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowComment((prev) => !prev)}
                  className="ml-auto text-xs text-[var(--drip-muted)] hover:text-[var(--drip-primary)]"
                >
                  {showComment ? t('approvals.step.commentHide') : t('approvals.step.commentShow')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{t('approvals.step.noPermission')}</p>
          )}
        </div>
      )}

      {step.status !== 'pending' && step.decidedBy && (
        <div className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
          {actorLabel}
          {step.comment && <span className="block mt-1 text-[var(--drip-text)] dark:text-neutral-200">{step.comment}</span>}
        </div>
      )}
    </div>
  );
}

const ApprovalFlow: React.FC<ApprovalFlowProps> = ({ flow, currentUserRole, onDecision, isProcessing = false }) => {
  const { t, language } = useLanguage();
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!flow.steps.some((step) => step.status === 'pending')) {
      return;
    }
    const frame = window.requestAnimationFrame(() => setCurrentTime(Date.now()));
    return () => window.cancelAnimationFrame(frame);
  }, [flow.steps]);

  const statusColors: Record<typeof flow.status, string> = {
    pending: 'text-amber-600 dark:text-amber-400',
    approved: 'text-emerald-600 dark:text-emerald-400',
    rejected: 'text-red-600 dark:text-red-400',
  };

  const flowStatusLabel = t(`approvals.status.${flow.status}`);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-6 shadow-md">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">{flow.title}</h3>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
            {flow.type.toUpperCase()} • {new Date(flow.submittedAt).toLocaleString(language)}
          </p>
        </div>
        <div className={`text-sm font-semibold ${statusColors[flow.status]}`}>
          {flowStatusLabel}
        </div>
      </header>

      {flow.metadata && Object.keys(flow.metadata).length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {Object.entries(flow.metadata).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-slate-100 dark:bg-neutral-900/60 p-3">
              <dt className="text-xs uppercase tracking-wide text-[var(--drip-muted)] dark:text-neutral-500">{key}</dt>
              <dd className="text-[var(--drip-text)] dark:text-neutral-100">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="space-y-3">
        {flow.steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            language={language}
            currentUserRole={currentUserRole}
            onDecision={(decision, comment) => onDecision(flow.id, step.id, decision, comment)}
            disabled={isProcessing}
            currentTime={currentTime}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

export default ApprovalFlow;
