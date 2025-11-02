import * as React from 'react';
import { OKRRecord } from '../../../types';

interface OkrValidationModalProps {
  okr: OKRRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onValidate: (notes?: string) => Promise<void> | void;
}

const OkrValidationModal: React.FC<OkrValidationModalProps> = ({ okr, isOpen, onClose, onValidate }) => {
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setNotes('');
    setError(null);
  }, [isOpen, okr?.id]);

  if (!isOpen || !okr) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onValidate(notes.trim() ? notes.trim() : undefined);
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'OKR doğrulanamadı.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-slate-200 dark:border-neutral-700">
        <div className="border-b border-slate-100 dark:border-neutral-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">OKR Doğrulaması</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{okr.objective}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span>Notlar (opsiyonel)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Denetim için kısa bir not bırakabilirsiniz"
            />
          </label>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Doğrulanıyor…' : 'Onayla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OkrValidationModal;
