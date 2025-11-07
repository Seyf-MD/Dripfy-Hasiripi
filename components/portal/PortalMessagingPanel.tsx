import * as React from 'react';
import type { PortalMessage } from '../../types';
import { Send } from 'lucide-react';

interface PortalMessagingPanelProps {
  messages: PortalMessage[];
  onSend: (payload: { body: string }) => Promise<void>;
  isSending?: boolean;
}

export const PortalMessagingPanel: React.FC<PortalMessagingPanelProps> = ({ messages, onSend, isSending }) => {
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError('Lütfen mesajınızı yazın.');
      return;
    }
    await onSend({ body: message.trim() });
    setMessage('');
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Mesajlaşma Alanı</h2>
        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
          Paydaş ekibi ile eş zamanlı iletişimi koordine edin.
        </p>
      </div>
      <div className="border border-slate-200 dark:border-neutral-800 rounded-xl h-64 overflow-y-auto bg-slate-50/60 dark:bg-neutral-800/40 p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">Henüz bir mesaj paylaşılmadı.</p>
        )}
        {messages.map((entry) => (
          <div
            key={entry.id}
            className={`flex flex-col ${entry.direction === 'outbound' ? 'items-end text-right' : 'items-start text-left'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm shadow-sm ${
                entry.direction === 'outbound'
                  ? 'bg-[var(--drip-primary)] text-white'
                  : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-[var(--drip-text)] dark:text-white'
              }`}
            >
              <p>{entry.body}</p>
            </div>
            <span className="mt-1 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
              {entry.author?.name || entry.author?.email || 'Bilinmeyen Kullanıcı'} •{' '}
              {new Date(entry.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          placeholder="Mesajınızı yazın..."
        />
        {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[var(--drip-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {isSending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PortalMessagingPanel;
