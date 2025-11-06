import * as React from 'react';
import {
  type SignupFunnelDataset,
  type SignupFunnelFilters,
  type SignupFunnelResult,
  type SignupFunnelSegmentType,
} from '../../types';
import { calculateSignupFunnel, listAvailableSignupFunnelSegments } from '../../services/analytics/funnel';

interface SignupFunnelProps {
  dataset: SignupFunnelDataset;
  className?: string;
  defaultRangeDays?: number;
}

interface DateRangeOption {
  id: string;
  label: string;
  days: number | null;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { id: '7', label: 'Son 7 Gün', days: 7 },
  { id: '30', label: 'Son 30 Gün', days: 30 },
  { id: '90', label: 'Son 90 Gün', days: 90 },
  { id: 'all', label: 'Tüm Zamanlar', days: null },
];

const SEGMENT_LABELS: Record<SignupFunnelSegmentType, string> = {
  source: 'Kaynak',
  campaign: 'Kampanya',
  country: 'Ülke',
};

const UNKNOWN_LABEL = 'Bilinmiyor';

function buildFilters(
  selectedType: SignupFunnelSegmentType | null,
  selectedValue: string | null,
  selectedRange: DateRangeOption
): SignupFunnelFilters {
  const filters: SignupFunnelFilters = {};
  if (selectedType && selectedValue && selectedValue !== '__all__') {
    filters.segment = { type: selectedType, value: selectedValue };
  }
  if (selectedRange.days !== null) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (selectedRange.days ?? 0));
    filters.startDate = start.toISOString();
  }
  return filters;
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} dk`;
  }
  const hours = seconds / 3600;
  if (hours < 48) {
    return `${hours.toFixed(1)} sa`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} gün`;
}

const StatCard: React.FC<{ title: string; value: string; helper?: string; tone?: 'default' | 'success' | 'danger' }> = ({
  title,
  value,
  helper,
  tone = 'default',
}) => {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'danger'
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-900 dark:text-slate-100';
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 p-4 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{helper}</p>}
    </div>
  );
};

const FunnelStageRow: React.FC<{ stage: SignupFunnelResult['stages'][number]; isHighlighted: boolean }> = ({ stage, isHighlighted }) => {
  const conversion = `${stage.conversionRate.toFixed(1)}%`;
  const dropOff = `${stage.dropOffRate.toFixed(1)}%`;
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isHighlighted
          ? 'border-red-300 dark:border-red-600 bg-red-50/60 dark:bg-red-500/10'
          : 'border-slate-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stage.label}</h4>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{stage.uniqueLeads} lead</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-neutral-400">Dönüşüm</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{conversion}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-neutral-400">Kayıp</p>
            <p className="font-semibold text-red-600 dark:text-red-400">{dropOff}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-neutral-400">Süre</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatSeconds(stage.averageLeadTimeSeconds)}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(stage.cumulativeConversion, 100)}%` }}
        />
      </div>
    </div>
  );
};

export const SignupFunnel: React.FC<SignupFunnelProps> = ({ dataset, className, defaultRangeDays = 30 }) => {
  const segmentOptions = React.useMemo(() => listAvailableSignupFunnelSegments(dataset), [dataset]);
  const defaultRange = React.useMemo(() => {
    const fallback = DATE_RANGE_OPTIONS.find((option) => option.id === String(defaultRangeDays));
    return fallback ?? DATE_RANGE_OPTIONS[1];
  }, [defaultRangeDays]);
  const [segmentType, setSegmentType] = React.useState<SignupFunnelSegmentType | null>('source');
  const [segmentValue, setSegmentValue] = React.useState<string | null>('__all__');
  const [dateRange, setDateRange] = React.useState<DateRangeOption>(defaultRange);

  const filters = React.useMemo(() => buildFilters(segmentType, segmentValue, dateRange), [segmentType, segmentValue, dateRange]);

  const result = React.useMemo<SignupFunnelResult>(() => calculateSignupFunnel(dataset, filters), [dataset, filters]);

  const dropOffStageId = React.useMemo(() => {
    const stages = [...result.stages].filter((stage) => stage.dropOffRate > 0);
    if (!stages.length) {
      return null;
    }
    return stages.reduce((max, current) => (current.dropOffRate > max.dropOffRate ? current : max)).stageId;
  }, [result.stages]);

  const currentSegmentValues = React.useMemo(() => {
    if (!segmentType) {
      return [];
    }
    const values = segmentOptions[segmentType] ?? [];
    const uniqueValues = Array.from(new Set(values.map((value) => value || UNKNOWN_LABEL)));
    return uniqueValues;
  }, [segmentOptions, segmentType]);

  const breakdown = React.useMemo(() => {
    return result.breakdown.filter((row) => (segmentType ? row.type === segmentType : true)).slice(0, 6);
  }, [result.breakdown, segmentType]);

  const handleSegmentTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SignupFunnelSegmentType | 'all';
    if (value === 'all') {
      setSegmentType(null);
      setSegmentValue('__all__');
    } else {
      setSegmentType(value);
      setSegmentValue('__all__');
    }
  };

  return (
    <section className={`rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/60 p-6 shadow-xl backdrop-blur ${className ?? ''}`}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kayıt Hunisi</h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400">Segment bazlı dönüşüm ve drop-off analizi</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-col text-sm">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">Segment</label>
            <select
              value={segmentType ?? 'all'}
              onChange={handleSegmentTypeChange}
              className="mt-1 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tümü</option>
              <option value="source">Kaynak</option>
              <option value="campaign">Kampanya</option>
              <option value="country">Ülke</option>
            </select>
          </div>
          {segmentType && (
            <div className="flex flex-col text-sm">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                {SEGMENT_LABELS[segmentType]} Değeri
              </label>
              <select
                value={segmentValue ?? '__all__'}
                onChange={(event) => setSegmentValue(event.target.value)}
                className="mt-1 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="__all__">Tümü</option>
                {currentSegmentValues.map((value) => (
                  <option key={value} value={value}>
                    {value || UNKNOWN_LABEL}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col text-sm">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">Tarih Aralığı</label>
            <select
              value={dateRange.id}
              onChange={(event) => {
                const option = DATE_RANGE_OPTIONS.find((item) => item.id === event.target.value);
                if (option) {
                  setDateRange(option);
                }
              }}
              className="mt-1 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Toplam Lead" value={String(result.totalLeads)} />
        <StatCard title="Genel Dönüşüm" value={`${result.overallConversionRate.toFixed(1)}%`} tone="success" />
        <StatCard title="Ortalama Süre" value={formatSeconds(result.averageLeadTimeSeconds)} helper="İlk ziyaretten onaya" />
      </div>

      <div className="mt-6 space-y-4">
        {result.stages.map((stage) => (
          <FunnelStageRow key={stage.stageId} stage={stage} isHighlighted={stage.stageId === dropOffStageId} />
        ))}
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Segment Performansı</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          En yüksek dönüşüm ve drop-off noktaları. Performansı düşen segmentleri yeniden hedefleyin.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800 text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/80">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-400">Segment</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-400">Lead</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-400">Dönüşüm</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500 dark:text-neutral-400">Drop-off Aşaması</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {breakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-slate-500 dark:text-neutral-400">
                    Bu filtre için yeterli veri yok.
                  </td>
                </tr>
              )}
              {breakdown.map((row) => (
                <tr key={`${row.type}-${row.key}`} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">
                    <span className="mr-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {SEGMENT_LABELS[row.type]}
                    </span>
                    {row.key || UNKNOWN_LABEL}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.totalLeads}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{row.conversionRate.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {row.dropOffStageId ? dataset.stages.find((stage) => stage.id === row.dropOffStageId)?.label ?? 'Belirsiz' : 'Tamamlandı'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default SignupFunnel;
