import * as React from 'react';
import { Department, OperationalRole, OKRRecord } from '../../../types';
import type { SaveOkrPayload } from '../../../services/analytics';

interface OkrFormModalProps {
  isOpen: boolean;
  okr: OKRRecord | null;
  availableRoles: OperationalRole[];
  availableDepartments: Department[];
  onClose: () => void;
  onSubmit: (payload: SaveOkrPayload) => Promise<void> | void;
}

const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

const OkrFormModal: React.FC<OkrFormModalProps> = ({
  isOpen,
  okr,
  availableRoles,
  availableDepartments,
  onClose,
  onSubmit,
}) => {
  const [objective, setObjective] = React.useState(okr?.objective ?? '');
  const [ownerRole, setOwnerRole] = React.useState<OperationalRole>(okr?.ownerRole ?? availableRoles[0]);
  const [department, setDepartment] = React.useState<Department>(okr?.department ?? availableDepartments[0]);
  const [progress, setProgress] = React.useState<number>(okr?.progress ?? 0);
  const [currentValue, setCurrentValue] = React.useState<number>(okr?.metrics.current ?? 0);
  const [targetValue, setTargetValue] = React.useState<number>(okr?.metrics.target ?? 100);
  const [requiresValidation, setRequiresValidation] = React.useState<boolean>(okr?.requiresValidation ?? false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setObjective(okr?.objective ?? '');
    setOwnerRole(okr?.ownerRole ?? availableRoles[0]);
    setDepartment(okr?.department ?? availableDepartments[0]);
    setProgress(okr?.progress ?? 0);
    setCurrentValue(okr?.metrics.current ?? 0);
    setTargetValue(okr?.metrics.target ?? 100);
    setRequiresValidation(okr?.requiresValidation ?? false);
    setError(null);
  }, [isOpen, okr, availableRoles, availableDepartments]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        id: okr?.id,
        objective,
        ownerRole,
        department,
        progress,
        requiresValidation,
        metrics: {
          ...okr?.metrics,
          current: currentValue,
          target: targetValue,
        },
      });
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'OKR kaydedilemedi.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = okr ? 'OKR Güncelle' : 'Yeni OKR Oluştur';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-slate-200 dark:border-neutral-700">
        <div className="border-b border-slate-100 dark:border-neutral-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Hedef</label>
            <input
              type="text"
              required
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Rol</span>
              <select
                value={ownerRole}
                onChange={(event) => setOwnerRole(event.target.value as OperationalRole)}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableRoles.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>{roleOption}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Departman</span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value as Department)}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>İlerleme</span>
              <span>{numberFormatter.format(progress * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Mevcut Değer</span>
              <input
                type="number"
                value={currentValue}
                onChange={(event) => setCurrentValue(Number(event.target.value))}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Hedef Değer</span>
              <input
                type="number"
                value={targetValue}
                onChange={(event) => setTargetValue(Number(event.target.value))}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={requiresValidation}
              onChange={(event) => setRequiresValidation(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Güncellemeler için onay gerektir
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500"
              disabled={isSubmitting}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OkrFormModal;
