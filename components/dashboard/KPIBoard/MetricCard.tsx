import * as React from 'react';
import { KPITrendMetric } from '../../../types';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MetricCardProps {
  metric: KPITrendMetric;
  isPrimary?: boolean;
}

const valueFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

const MetricCard: React.FC<MetricCardProps> = ({ metric, isPrimary }) => {
  const { t } = useLanguage();
  const { label, value, unit, description, trend } = metric;
  const formattedValue = unit === '%' ? `${valueFormatter.format(value)}%` : `${unit}${valueFormatter.format(value)}`;

  // Translate metric labels
  const translatedLabel = React.useMemo(() => {
    const labelMap: Record<string, string> = {
      'Net Cash Flow': t('okr.metrics.netCashFlow'),
      'Task Completion': t('okr.metrics.taskCompletion'),
      'Average OKR Progress': t('okr.metrics.averageProgress'),
    };
    return labelMap[label] || label;
  }, [label, t]);

  const translatedDescription = React.useMemo(() => {
    const descMap: Record<string, string> = {
      'Incoming minus outgoing cash flow': t('okr.metrics.netCashFlowDesc'),
      'Completed tasks versus all tasks': t('okr.metrics.taskCompletionDesc'),
      'Average progress of active OKRs': t('okr.metrics.averageProgressDesc'),
    };
    return descMap[description] || description;
  }, [description, t]);

  const badge = React.useMemo(() => {
    if (trend === undefined) {
      return null;
    }
    const formattedTrend = valueFormatter.format(trend);
    if (trend === 0) {
      return <span className="text-xs text-slate-500 dark:text-slate-400">{t('okr.metrics.trendStable')}</span>;
    }
    const trendLabel = trend > 0 ? '↑' : '↓';
    const color = trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400';
    return <span className={`text-xs font-semibold ${color}`}>{`${trendLabel} ${formattedTrend}`}</span>;
  }, [trend, t]);

  return (
    <div className={`p-5 rounded-xl border transition-all duration-200 ${isPrimary ? 'bg-white/80 dark:bg-neutral-800 border-emerald-200/80 dark:border-emerald-700/50 shadow-lg' : 'bg-white/40 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{translatedLabel}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{formattedValue}</p>
        </div>
        {badge}
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{translatedDescription}</p>
    </div>
  );
};

export default MetricCard;
