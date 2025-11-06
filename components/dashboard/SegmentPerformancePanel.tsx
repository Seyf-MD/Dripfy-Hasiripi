import * as React from 'react';
import { Target, TrendingUp, Users } from 'lucide-react';
import {
  SegmentDefinition,
  SegmentDrillDownRecord,
  SegmentPerformanceMetric,
} from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface SegmentPerformancePanelProps {
  segments: SegmentDefinition[];
  performance: SegmentPerformanceMetric[];
  drillDowns: SegmentDrillDownRecord[];
  onSelectSegment?: (segmentId: string) => void;
  selectedSegmentId?: string | null;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const SegmentPerformancePanel: React.FC<SegmentPerformancePanelProps> = ({
  segments,
  performance,
  drillDowns,
  onSelectSegment,
  selectedSegmentId,
}) => {
  const { t } = useLanguage();
  const [internalSelected, setInternalSelected] = React.useState<string | null>(selectedSegmentId ?? null);

  React.useEffect(() => {
    if (selectedSegmentId !== undefined) {
      setInternalSelected(selectedSegmentId);
    }
  }, [selectedSegmentId]);

  React.useEffect(() => {
    if (internalSelected === null && performance.length > 0) {
      setInternalSelected(performance[0].segmentId);
    }
  }, [internalSelected, performance]);

  const handleSegmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setInternalSelected(next);
    onSelectSegment?.(next);
  };

  const activePerformance = React.useMemo(() => {
    return performance.find((item) => item.segmentId === internalSelected) ?? performance[0] ?? null;
  }, [internalSelected, performance]);

  const activeDrilldowns = React.useMemo(
    () => drillDowns.filter((item) => item.segmentId === activePerformance?.segmentId),
    [drillDowns, activePerformance],
  );

  const topSegments = React.useMemo(
    () => performance.slice().sort((a, b) => b.revenueContribution - a.revenueContribution).slice(0, 3),
    [performance],
  );

  if (!performance.length) {
    return null;
  }

  return (
    <section className="mt-8 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('segments.performanceTitle')}</h2>
          <p className="text-sm text-slate-500 dark:text-neutral-400">{t('segments.performanceSubtitle', 'Segment bazlı sağlık durumunu izleyin')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="segment-select" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            {t('segments.selectPlaceholder')}
          </label>
          <select
            id="segment-select"
            value={activePerformance?.segmentId ?? ''}
            onChange={handleSegmentChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {topSegments.map((item) => {
          const segmentMeta = segments.find((segment) => segment.id === item.segmentId);
          return (
            <div key={item.segmentId} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm transition hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{segmentMeta?.name ?? item.segmentName}</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.members', { count: item.memberCount }).replace('{count}', item.memberCount.toString())}</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <TrendingUp size={18} />
                </div>
              </div>
              <dl className="mt-3 space-y-2 text-sm text-slate-600 dark:text-neutral-200">
                <div className="flex items-center justify-between">
                  <dt>{t('segments.revenueContribution')}</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.revenueContribution)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>{t('segments.engagement')}</dt>
                  <dd className="font-semibold">{item.engagementScore}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>{t('segments.expansion')}</dt>
                  <dd className="font-semibold">{formatPercent(item.expansionPotential)}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {activePerformance && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
            <header className="flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{segments.find((segment) => segment.id === activePerformance.segmentId)?.name ?? activePerformance.segmentName}</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.members', { count: activePerformance.memberCount }).replace('{count}', activePerformance.memberCount.toString())}</p>
              </div>
            </header>
            <dl className="space-y-2 text-sm text-slate-600 dark:text-neutral-200">
              <div className="flex items-center justify-between">
                <dt>{t('segments.revenueContribution')}</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(activePerformance.revenueContribution)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>{t('segments.engagement')}</dt>
                <dd className="font-semibold">{activePerformance.engagementScore}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>{t('segments.expectedGrowth', 'Gelir büyümesi')}</dt>
                <dd className="font-semibold">{formatPercent(activePerformance.revenueGrowth)}</dd>
              </div>
            </dl>
          </div>
          <div className="lg:col-span-3 space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
            <header className="flex items-center gap-2">
              <Target size={18} className="text-indigo-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('segments.drilldownTitle')}</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.drilldownSubtitle', 'Anahtar metriklerin kısa özeti')}</p>
              </div>
            </header>
            <div className="grid gap-3 md:grid-cols-2">
              {activeDrilldowns.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">{entry.title}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{typeof entry.value === 'number' ? entry.value : '-'} <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">({entry.period})</span></p>
                  <p className={`text-xs font-medium ${entry.delta >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-500 dark:text-red-300'}`}>
                    {entry.delta >= 0 ? '+' : ''}{entry.delta}{entry.metric === 'pipelineValue' ? '€' : '%'}
                  </p>
                  {entry.narrative && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{entry.narrative}</p>
                  )}
                </div>
              ))}
              {activeDrilldowns.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                  {t('segments.noDrilldown', 'Bu segment için detaylı rapor bulunmuyor.')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SegmentPerformancePanel;
