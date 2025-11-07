import * as React from 'react';
import type { StakeholderPortalStatus } from '../../types';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PortalStatusTrackerProps {
  statuses: StakeholderPortalStatus[];
  onAcknowledge: (statusId: string) => Promise<void>;
  isProcessing?: boolean;
}

const statusColorMap: Record<StakeholderPortalStatus['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
  blocked: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200',
};

const statusIconMap: Record<StakeholderPortalStatus['status'], React.ReactNode> = {
  pending: <Clock size={16} />,
  'in-progress': <Clock size={16} />,
  completed: <CheckCircle2 size={16} />,
  blocked: <AlertTriangle size={16} />,
};

export const PortalStatusTracker: React.FC<PortalStatusTrackerProps> = ({ statuses, onAcknowledge, isProcessing }) => {
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const handleAcknowledge = async (statusId: string) => {
    setProcessingId(statusId);
    try {
      await onAcknowledge(statusId);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Portal İlerleme Adımları</h2>
        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
          Onboarding akışındaki her adımı takip edin ve tamamlananları onaylayın.
        </p>
      </div>
      <div className="space-y-4">
        {statuses.map((status) => {
          const isDone = status.status === 'completed';
          const isBlocked = status.status === 'blocked';
          const badgeClass = statusColorMap[status.status];
          const isBusy = processingId === status.id || isProcessing;
          return (
            <div
              key={status.id}
              className="border border-slate-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col gap-3 bg-slate-50/60 dark:bg-neutral-800/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                    {statusIconMap[status.status]}
                    {status.status === 'pending' && 'Beklemede'}
                    {status.status === 'in-progress' && 'Devam ediyor'}
                    {status.status === 'completed' && 'Tamamlandı'}
                    {status.status === 'blocked' && 'Bloke'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">
                  Güncellendi: {new Date(status.lastUpdatedAt).toLocaleString()}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{status.title}</h3>
                <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-300 mt-1">{status.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                <span>
                  {status.dueDate
                    ? `Hedef Tarih: ${new Date(status.dueDate).toLocaleDateString()}`
                    : 'Hedef tarih belirlenmedi'}
                </span>
                {status.acknowledgedAt && <span>Onaylandı: {new Date(status.acknowledgedAt).toLocaleString()}</span>}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleAcknowledge(status.id)}
                  disabled={isDone || isBlocked || isBusy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-200 cursor-default'
                      : 'bg-[var(--drip-primary)] text-white hover:bg-[var(--drip-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                >
                  {isDone ? 'Tamamlandı' : isBusy ? 'Kaydediliyor...' : 'Onayla'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortalStatusTracker;
