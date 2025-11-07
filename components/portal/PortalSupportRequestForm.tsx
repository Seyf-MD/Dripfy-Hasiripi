import * as React from 'react';
import type { PortalSupportRequest } from '../../types';

interface PortalSupportRequestFormProps {
  requests: PortalSupportRequest[];
  onSubmit: (payload: { subject: string; message: string; category?: string; priority?: 'low' | 'normal' | 'high' }) => Promise<void>;
  isSubmitting?: boolean;
}

const priorityLabels: Record<'low' | 'normal' | 'high', string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
};

export const PortalSupportRequestForm: React.FC<PortalSupportRequestFormProps> = ({ requests, onSubmit, isSubmitting }) => {
  const [formState, setFormState] = React.useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal' as 'low' | 'normal' | 'high',
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!formState.subject.trim() || !formState.message.trim()) {
      setError('Lütfen konu ve mesaj alanlarını doldurun.');
      return;
    }
    await onSubmit({
      subject: formState.subject.trim(),
      message: formState.message.trim(),
      category: formState.category,
      priority: formState.priority,
    });
    setFormState({ subject: '', message: '', category: 'general', priority: 'normal' });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Destek Talepleri</h2>
        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
          MIS entegrasyonu ve operasyon sorularınızı kayıt altına alın.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white mb-1">Konu</label>
            <input
              name="subject"
              value={formState.subject}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Örneğin: MIS erişimi"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white mb-1">Kategori</label>
              <select
                name="category"
                value={formState.category}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              >
                <option value="general">Genel</option>
                <option value="integration">Entegrasyon</option>
                <option value="billing">Faturalama</option>
                <option value="training">Eğitim</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white mb-1">Öncelik</label>
              <select
                name="priority"
                value={formState.priority}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              >
                <option value="low">Düşük</option>
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--drip-text)] dark:text-white mb-1">Mesaj</label>
          <textarea
            name="message"
            value={formState.message}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            placeholder="İhtiyacınızı detaylandırın"
          />
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[var(--drip-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Destek Talebi Oluştur'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">Son Talepler</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {requests.length === 0 && (
            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">Henüz kayıtlı destek talebi yok.</p>
          )}
          {requests.map((request) => (
            <div key={request.id} className="border border-slate-200 dark:border-neutral-800 rounded-xl p-3 bg-slate-50/60 dark:bg-neutral-800/40">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                <span>{new Date(request.createdAt).toLocaleString()}</span>
                <span className="font-medium">{priorityLabels[request.priority]}</span>
              </div>
              <h4 className="mt-1 text-sm font-semibold text-[var(--drip-text)] dark:text-white">{request.subject}</h4>
              <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-300 mt-1">{request.message}</p>
              <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
                Durum: {request.status === 'in-progress' ? 'İşlemde' : request.status === 'resolved' ? 'Tamamlandı' : 'Açık'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortalSupportRequestForm;
