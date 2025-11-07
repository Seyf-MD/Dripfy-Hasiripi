import * as React from 'react';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { InvoiceDocument, InvoiceRiskLevel } from '../../types';

interface InvoiceStatusPanelProps {
  invoices: InvoiceDocument[];
  selectedInvoiceId: string | null;
  onSelect: (invoiceId: string) => void;
}

const riskStyles: Record<InvoiceRiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  pending: <Clock className="w-4 h-4 text-amber-500" />,
  rejected: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

function formatCurrency(amount?: number | null, currency = 'EUR') {
  if (!Number.isFinite(amount ?? NaN)) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount ?? 0);
  } catch (_error) {
    return `${amount?.toFixed(2)} ${currency}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('tr-TR');
}

export const InvoiceStatusPanel: React.FC<InvoiceStatusPanelProps> = ({ invoices, selectedInvoiceId, onSelect }) => {
  const totalByStatus = React.useMemo(() => {
    return invoices.reduce((acc: Record<string, number>, invoice) => {
      const key = invoice.approval?.status || 'pending';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [invoices]);

  return (
    <div className="bg-white dark:bg-neutral-900/40 rounded-xl border border-slate-200 dark:border-neutral-700">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-neutral-700">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Fatura Onay Durumu</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">Toplam {invoices.length} doküman izleniyor</p>
        </div>
        <div className="flex gap-4 text-xs text-slate-500 dark:text-neutral-400">
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> {totalByStatus.approved || 0} onaylandı</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" /> {totalByStatus.pending || 0} bekliyor</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" /> {totalByStatus.rejected || 0} reddedildi</span>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-neutral-800">
        {invoices.length === 0 && (
          <div className="p-6 text-sm text-slate-500 dark:text-neutral-400 flex items-center gap-3">
            <FileText className="w-5 h-5" />
            Henüz yüklenmiş bir fatura yok.
          </div>
        )}
        {invoices.map((invoice) => {
          const isActive = selectedInvoiceId === invoice.id;
          const riskLevel = invoice.risk?.level || 'low';
          const status = invoice.approval?.status || 'pending';
          return (
            <button
              key={invoice.id}
              type="button"
              onClick={() => onSelect(invoice.id)}
              className={`w-full flex items-start justify-between gap-6 px-5 py-4 text-left transition-colors ${isActive ? 'bg-slate-50 dark:bg-neutral-800/80' : 'hover:bg-slate-50/70 dark:hover:bg-neutral-800/40'}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${riskStyles[riskLevel as InvoiceRiskLevel]}`}>
                    {riskLevel === 'high' ? <AlertTriangle className="w-4 h-4" /> : riskLevel === 'medium' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    Risk: {riskLevel.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-neutral-400">{invoice.extractedFields?.invoiceNumber || invoice.fileName}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-neutral-300">
                  <p className="font-medium text-slate-900 dark:text-white">{invoice.extractedFields?.vendorName || 'Tedarikçi belirtilmedi'}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    {formatCurrency(invoice.extractedFields?.totalAmount, invoice.extractedFields?.currency || 'EUR')} · Vade {formatDate(invoice.extractedFields?.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-slate-500 dark:text-neutral-400">
                <div className="flex items-center gap-1 font-medium uppercase tracking-wide">
                  {statusIcons[status] || <Clock className="w-4 h-4 text-amber-500" />}
                  {status === 'approved' ? 'Onaylandı'
                    : status === 'rejected' ? 'Reddedildi'
                      : 'Beklemede'}
                </div>
                <span>
                  {invoice.payment?.predicted
                    ? `Gecikme riski: ${invoice.payment.predicted.level.toUpperCase()} (${invoice.payment.predicted.riskScore}%)`
                    : 'Gecikme tahmini: —'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceStatusPanel;
