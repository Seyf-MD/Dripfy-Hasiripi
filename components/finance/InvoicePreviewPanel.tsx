import * as React from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { InvoiceDocument, InvoicePreviewReference } from '../../types';

interface InvoicePreviewPanelProps {
  invoice: InvoiceDocument | null;
  preview: InvoicePreviewReference | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount?: number | null, currency = 'EUR') {
  if (!Number.isFinite(amount ?? NaN)) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount ?? 0);
  } catch (_error) {
    return `${amount?.toFixed(2)} ${currency}`;
  }
}

export const InvoicePreviewPanel: React.FC<InvoicePreviewPanelProps> = ({ invoice, preview, loading, onRefresh }) => {
  if (!invoice) {
    return (
      <div className="bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-700 rounded-xl p-6 text-sm text-slate-500 dark:text-neutral-400">
        Önizleme için bir fatura seçin.
      </div>
    );
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 text-sm text-slate-500 dark:text-neutral-400">
          Önizleme yükleniyor...
        </div>
      );
    }
    if (!preview?.url) {
      return (
        <div className="flex items-center justify-center h-64 text-sm text-slate-500 dark:text-neutral-400">
          Doküman önizlemesi üretilemedi.
        </div>
      );
    }
    if (preview.type === 'data-url' && preview.url.startsWith('data:image')) {
      return <img src={preview.url} alt={invoice.fileName} className="w-full h-64 object-contain rounded-lg border border-slate-200 dark:border-neutral-700" />;
    }
    return (
      <iframe
        src={preview.url}
        title={`Invoice preview ${invoice.id}`}
        className="w-full h-64 rounded-lg border border-slate-200 dark:border-neutral-700"
      />
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-700">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Doküman Önizlemesi</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            {invoice.extractedFields?.vendorName || 'Tedarikçi belirtilmedi'} · {invoice.extractedFields?.invoiceNumber || invoice.fileName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Yenile
          </button>
          {preview?.url && (
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--drip-primary)] text-white hover:bg-[var(--drip-primary-dark)]"
            >
              <ExternalLink className="w-4 h-4" /> Yeni sekme
            </a>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600 dark:text-neutral-300">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">Toplam Tutar</p>
            <p className="font-semibold text-slate-900 dark:text-white">{formatAmount(invoice.extractedFields?.totalAmount, invoice.extractedFields?.currency || 'EUR')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">Vade</p>
            <p className="font-semibold text-slate-900 dark:text-white">{formatDate(invoice.extractedFields?.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">Risk Skoru</p>
            <p className="font-semibold text-slate-900 dark:text-white">{invoice.risk?.score ?? '—'} / 99 ({invoice.risk?.level?.toUpperCase?.() || 'N/A'})</p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-100 dark:bg-neutral-800/80 p-4 text-sm text-slate-600 dark:text-neutral-300">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400 mb-2">Önemli Notlar</p>
          <ul className="list-disc list-inside space-y-1">
            {(invoice.approval?.notes && invoice.approval.notes.length > 0)
              ? invoice.approval.notes.map((note) => <li key={note}>{note}</li>)
              : <li>Onay akışı için özel not bulunmuyor.</li>}
            {(invoice.risk?.factors || []).map((factor) => <li key={factor}>{factor}</li>)}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-neutral-300">
            <span>Ödeme durumu</span>
            <span className="font-semibold text-slate-900 dark:text-white">{invoice.payment?.status || 'pending'}</span>
          </div>
          {invoice.payment?.reference && (
            <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">Referans: {invoice.payment.reference}</div>
          )}
          {invoice.payment?.predicted && (
            <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              Tahmini gecikme: {invoice.payment.predicted.expectedDelayDays ?? 0} gün · Risk: {invoice.payment.predicted.level.toUpperCase()} ({invoice.payment.predicted.riskScore}%)
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 p-4">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewPanel;
