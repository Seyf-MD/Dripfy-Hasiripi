import * as React from 'react';
import { TrendingUp, Flame, Timer, AlertTriangle } from 'lucide-react';
import type { TaskSLAReport } from '../../types';

interface SLADashboardProps {
  reports: TaskSLAReport[];
}

function buildAggregateMetrics(reports: TaskSLAReport[]) {
  if (reports.length === 0) {
    return { total: 0, breached: 0, warning: 0, avgResolution: 0 };
  }
  const totals = reports.reduce(
    (acc, report) => {
      acc.total += report.totalTracked;
      acc.breached += report.breached;
      acc.warning += report.warning;
      acc.avgResolution += report.averageResolutionHours;
      return acc;
    },
    { total: 0, breached: 0, warning: 0, avgResolution: 0 },
  );
  return {
    total: totals.total,
    breached: totals.breached,
    warning: totals.warning,
    avgResolution: Math.round((totals.avgResolution / reports.length) * 10) / 10,
  };
}

const SLADashboard: React.FC<SLADashboardProps> = ({ reports }) => {
  const aggregate = React.useMemo(() => buildAggregateMetrics(reports), [reports]);

  if (!reports || reports.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--drip-text)] dark:text-white">SLA Durum Panosu</h3>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
            Ekiplerin SLA performansını takip edin, riskli görevleri öne çıkarın ve trendleri inceleyin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
            <TrendingUp size={16} /> {aggregate.total} takipte
          </span>
          <span className="flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
            <AlertTriangle size={16} /> {aggregate.warning} riskli
          </span>
          <span className="flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
            <Flame size={16} /> {aggregate.breached} ihlal
          </span>
          <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-[var(--drip-muted)] dark:bg-neutral-800 dark:text-neutral-300">
            <Timer size={16} /> Ø {aggregate.avgResolution} saat çözüm
          </span>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          {reports.map((report) => {
            const max = Math.max(
              ...report.trend.map((point) => point.onTrack + point.warning + point.breached),
              1,
            );
            return (
              <div key={report.id} className="rounded-xl border border-slate-200 p-4 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{report.label}</p>
                    <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                      {report.totalTracked} görev izleniyor · {report.breached} ihlal · {report.warning} riskli
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[var(--drip-muted)] dark:bg-neutral-800 dark:text-neutral-300">
                    Trend analizi
                  </span>
                </div>
                <div className="mt-4 flex gap-3 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                  {report.trend.map((point) => {
                    const total = point.onTrack + point.warning + point.breached;
                    return (
                      <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex h-20 w-full flex-col-reverse overflow-hidden rounded-lg border border-slate-100 dark:border-neutral-800">
                          <div
                            className="bg-emerald-400"
                            style={{ height: `${(point.onTrack / max) * 100}%`, width: '100%' }}
                          />
                          <div
                            className="bg-amber-400"
                            style={{ height: `${(point.warning / max) * 100}%`, width: '100%' }}
                          />
                          <div
                            className="bg-rose-500"
                            style={{ height: `${(point.breached / max) * 100}%`, width: '100%' }}
                          />
                        </div>
                        <span className="text-[10px] uppercase">{new Date(point.date).toLocaleDateString()}</span>
                        <span className="text-[10px] font-semibold text-[var(--drip-muted)] dark:text-neutral-300">{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <aside className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-neutral-800">
          <h4 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">Kritik İhlaller</h4>
          <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
            SLA ihlali yaşayan görevler otomatik bildirim ve yeniden atama akışlarına aktarılır.
          </p>
          <div className="space-y-3">
            {reports.flatMap((report) => report.hotspots).slice(0, 4).map((hotspot) => (
              <div key={`${hotspot.taskId}-${hotspot.breachedAt}`} className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <p className="font-semibold">{hotspot.taskTitle}</p>
                <p>{hotspot.assignee}</p>
                <p className="text-[10px] uppercase">{new Date(hotspot.breachedAt).toLocaleString()}</p>
                <span className="mt-1 inline-flex rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:bg-rose-500/30 dark:text-rose-200">
                  Etki: {hotspot.impact}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default SLADashboard;
