import * as React from 'react';
import type {
  AbTestExperiment,
  CampaignPerformance,
  CampaignComparisonInsight,
  CapacitySnapshot,
  ScheduleEvent,
} from '../../types';

interface ReportsTabProps {
  experiments: AbTestExperiment[];
  campaigns: CampaignPerformance[];
  insights?: CampaignComparisonInsight[];
  capacity?: CapacitySnapshot[];
  schedule?: ScheduleEvent[];
}

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const toPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

const formatHours = (value: number): string => `${value.toFixed(1)}s`;

const computeConversionRate = (variant: AbTestExperiment['variants'][number]): number => {
  if (!variant.participants) {
    return 0;
  }
  return (variant.conversions / variant.participants) * 100;
};

const computeRom = (campaign: CampaignPerformance): number => {
  if (!campaign.metrics.spend) {
    return 0;
  }
  return ((campaign.metrics.revenue - campaign.metrics.spend) / campaign.metrics.spend) * 100;
};

const determineWinningVariant = (experiment: AbTestExperiment) => {
  return experiment.variants.reduce((best, variant) => {
    const current = computeConversionRate(variant);
    const bestRate = computeConversionRate(best);
    return current > bestRate ? variant : best;
  }, experiment.variants[0]);
};

const ExperimentCard: React.FC<{ experiment: AbTestExperiment }> = ({ experiment }) => {
  const winning = determineWinningVariant(experiment);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{experiment.name}</h4>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{experiment.goal}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          experiment.status === 'running' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-200'
        }`}>
          {experiment.status === 'running' ? 'Aktif' : 'Tamamlandı'}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {experiment.variants.map((variant) => {
          const rate = computeConversionRate(variant);
          const isWinner = winning.id === variant.id;
          return (
            <div key={variant.id} className="rounded-xl border border-slate-100 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isWinner ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-neutral-700 dark:text-neutral-200'
                  }`}>
                    {variant.label.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{variant.label}</p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {variant.conversions}/{variant.participants} dönüşüm · {formatPercent(rate)}
                    </p>
                  </div>
                </div>
                {variant.revenue != null && (
                  <span className="text-xs text-slate-500 dark:text-neutral-400">Gelir: {formatCurrency(variant.revenue)}</span>
                )}
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full ${isWinner ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-neutral-600'}`}
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
        Öneri: {winning.label} varyantı {formatPercent(computeConversionRate(winning))} ile en yüksek dönüşümü sağladı.
      </p>
    </div>
  );
};

const CampaignCard: React.FC<{ campaign: CampaignPerformance }> = ({ campaign }) => {
  const conversionRate = campaign.metrics.leads ? (campaign.metrics.conversions / campaign.metrics.leads) * 100 : 0;
  const rom = computeRom(campaign);
  const efficiency = campaign.metrics.spend ? campaign.metrics.revenue / campaign.metrics.spend : 0;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/60 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</h4>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{campaign.source.toUpperCase()} · {campaign.country ?? 'Global'}</p>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-neutral-400">
          <p>{campaign.period.start} → {campaign.period.end}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500 dark:text-neutral-400">Lead / Dönüşüm</dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{campaign.metrics.leads} → {campaign.metrics.conversions}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-neutral-400">Maliyet / Gelir</dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatCurrency(campaign.metrics.spend)} → {formatCurrency(campaign.metrics.revenue)}</dd>
        </div>
      </dl>
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
            <span>Dönüşüm Oranı</span>
            <span>{formatPercent(conversionRate)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(conversionRate, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
            <span>ROMI</span>
            <span>{formatPercent(rom)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
            <div className={`h-full rounded-full ${rom >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs(rom), 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
            <span>Gelir / Harcama</span>
            <span>{efficiency.toFixed(2)}x</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(efficiency * 25, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightBadge: React.FC<{ insight: CampaignComparisonInsight }> = ({ insight }) => {
  const toneClass =
    insight.severity === 'success'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
      : insight.severity === 'warning'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      : insight.severity === 'danger'
      ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300'
      : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-200';
  return (
    <div className={`rounded-2xl border border-transparent p-4 ${toneClass}`}>
      <h4 className="text-sm font-semibold">{insight.title}</h4>
      <p className="mt-1 text-xs leading-relaxed">{insight.detail}</p>
    </div>
  );
};

const ReportsTab: React.FC<ReportsTabProps> = ({ experiments, campaigns, insights, capacity, schedule }) => {
  const sortedExperiments = React.useMemo(() => experiments.slice().sort((a, b) => (a.status === 'running' ? -1 : 1)), [experiments]);
  const sortedCampaigns = React.useMemo(() => campaigns.slice().sort((a, b) => computeRom(b) - computeRom(a)), [campaigns]);
  const capacityData = React.useMemo(() => capacity ?? [], [capacity]);
  const scheduleData = React.useMemo(() => schedule ?? [], [schedule]);

  const capacitySummary = React.useMemo(() => {
    if (capacityData.length === 0) {
      return null;
    }
    const totals = capacityData.reduce(
      (acc, snapshot) => {
        const utilisation = snapshot.totalCapacity > 0 ? snapshot.allocated / snapshot.totalCapacity : snapshot.utilisation ?? 0;
        return {
          totalCapacity: acc.totalCapacity + snapshot.totalCapacity,
          totalAllocated: acc.totalAllocated + snapshot.allocated,
          totalBacklog: acc.totalBacklog + snapshot.backlog,
          utilisationSum: acc.utilisationSum + utilisation,
          count: acc.count + 1,
          peak:
            !acc.peak || utilisation > acc.peak.utilisation
              ? { utilisation, snapshot }
              : acc.peak,
        };
      },
      {
        totalCapacity: 0,
        totalAllocated: 0,
        totalBacklog: 0,
        utilisationSum: 0,
        count: 0,
        peak: null as null | { utilisation: number; snapshot: CapacitySnapshot },
      },
    );
    return {
      totalCapacity: totals.totalCapacity,
      totalAllocated: totals.totalAllocated,
      totalBacklog: totals.totalBacklog,
      averageUtilisation: totals.count > 0 ? totals.utilisationSum / totals.count : 0,
      peak: totals.peak,
    };
  }, [capacityData]);

  const teamCapacity = React.useMemo(() => {
    if (scheduleData.length === 0) {
      return [] as Array<{
        name: string;
        allocated: number;
        required: number;
        baseline: number;
        utilisation: number;
        shortfall: number;
        location?: string;
      }>;
    }
    const map = new Map<string, { name: string; allocated: number; required: number; baseline: number; location?: string }>();
    scheduleData.forEach((event) => {
      const key = event.team?.id || event.team?.name || event.id;
      const baseline = event.team?.capacityHoursPerDay || Math.max(event.team?.members?.length ?? 1, 1) * 6;
      const allocated = event.capacity?.allocatedHours ?? event.capacity?.requiredHours ?? 0;
      const required = event.capacity?.requiredHours ?? 0;
      if (map.has(key)) {
        const entry = map.get(key)!;
        entry.allocated += allocated;
        entry.required += required;
        entry.baseline = Math.max(entry.baseline, baseline);
      } else {
        map.set(key, {
          name: event.team?.name || 'Ekip',
          allocated,
          required,
          baseline,
          location: event.location?.name,
        });
      }
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        utilisation: entry.baseline > 0 ? entry.allocated / entry.baseline : 0,
        shortfall: entry.required - entry.baseline,
      }))
      .sort((a, b) => b.utilisation - a.utilisation);
  }, [scheduleData]);

  const bottlenecks = React.useMemo(() => {
    const items: Array<{ id: string; label: string; detail: string; severity: 'critical' | 'warning'; utilisation: number }> = [];
    teamCapacity.forEach((team) => {
      if (team.utilisation >= 0.85 || team.shortfall > 0) {
        items.push({
          id: `team-${team.name}`,
          label: team.name,
          detail: team.shortfall > 0
            ? `Eksik kapasite ${formatHours(Math.max(team.shortfall, 0))}`
            : `Kullanım ${toPercent(team.utilisation)}`,
          severity: team.utilisation >= 1 || team.shortfall > 0 ? 'critical' : 'warning',
          utilisation: team.utilisation,
        });
      }
    });
    capacityData.forEach((snapshot) => {
      const utilisation = snapshot.totalCapacity > 0 ? snapshot.allocated / snapshot.totalCapacity : snapshot.utilisation ?? 0;
      if (utilisation >= 0.9 || snapshot.backlog > 0) {
        items.push({
          id: `capacity-${snapshot.id}`,
          label: snapshot.unitLabel,
          detail: `Backlog ${snapshot.backlog} · Kullanım ${toPercent(utilisation)}`,
          severity: utilisation >= 1 || snapshot.backlog > snapshot.available ? 'critical' : 'warning',
          utilisation,
        });
      }
    });
    return items.sort((a, b) => b.utilisation - a.utilisation).slice(0, 4);
  }, [teamCapacity, capacityData]);

  return (
    <div className="space-y-8">
      <section>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">A/B Test Sonuçları</h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400">Varyant bazlı dönüşümler ve önerilen kazanan.</p>
          </div>
        </header>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {sortedExperiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
          {sortedExperiments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700 p-6 text-center text-sm text-slate-500 dark:text-neutral-400">
              Henüz A/B testi verisi yok.
            </div>
          )}
        </div>
      </section>

      <section>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kampanya Karşılaştırmaları</h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400">Kaynak bazlı performans, ROMI ve bütçe etkinliği.</p>
          </div>
        </header>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {sortedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
          {sortedCampaigns.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700 p-6 text-center text-sm text-slate-500 dark:text-neutral-400">
              Kampanya performans verisi bulunamadı.
            </div>
          )}
        </div>
      </section>

      <section>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kapasite Analitiği</h3>
            <p className="text-sm text-slate-500 dark:text-neutral-400">Ekip ve lokasyon bazlı kapasite kullanımı, darboğaz uyarıları.</p>
          </div>
        </header>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            {capacitySummary ? (
              <>
                <div className="text-3xl font-semibold text-slate-900 dark:text-white">{toPercent(Math.min(capacitySummary.averageUtilisation, 1))}</div>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Ortalama kapasite kullanımı</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-neutral-400">
                  <div>
                    <dt>Toplam Kapasite</dt>
                    <dd className="font-semibold text-slate-900 dark:text-neutral-200">{formatHours(capacitySummary.totalCapacity)}</dd>
                  </div>
                  <div>
                    <dt>Bloke</dt>
                    <dd className="font-semibold text-slate-900 dark:text-neutral-200">{formatHours(capacitySummary.totalAllocated)}</dd>
                  </div>
                  <div>
                    <dt>Backlog</dt>
                    <dd className="font-semibold text-slate-900 dark:text-neutral-200">{capacitySummary.totalBacklog}</dd>
                  </div>
                  <div>
                    <dt>Erişilebilir</dt>
                    <dd className="font-semibold text-slate-900 dark:text-neutral-200">{formatHours(Math.max(capacitySummary.totalCapacity - capacitySummary.totalAllocated, 0))}</dd>
                  </div>
                </dl>
                {capacitySummary.peak && (
                  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200">
                    En yoğun birim: <span className="font-semibold">{capacitySummary.peak.snapshot.unitLabel}</span> · {toPercent(capacitySummary.peak.utilisation)}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                Kapasite anlık görüntüsü bulunamadı.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lokasyon Bazlı Kullanım</h4>
            <div className="mt-3 space-y-3">
              {capacityData.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                  Lokasyon kapasite verisi bulunamadı.
                </div>
              )}
              {capacityData.map((snapshot) => {
                const utilisation = snapshot.totalCapacity > 0 ? snapshot.allocated / snapshot.totalCapacity : snapshot.utilisation ?? 0;
                const percent = toPercent(Math.min(utilisation, 1));
                return (
                  <div key={snapshot.id} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-neutral-800">
                    <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                      <span className="font-semibold text-slate-800 dark:text-neutral-100">{snapshot.unitLabel}</span>
                      <span>{percent}{utilisation > 1 ? '+' : ''}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-800">
                      <div
                        className={`${utilisation > 1 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full`}
                        style={{ width: `${Math.min(utilisation, 1.25) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                      <span>Backlog: {snapshot.backlog}</span>
                      <span>Uygun: {snapshot.available}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Takım Yükleri &amp; Darboğazlar</h4>
            <div className="mt-3 space-y-3">
              {teamCapacity.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                  Planlanmış ekip kapasitesi bulunamadı.
                </div>
              )}
              {teamCapacity.slice(0, 4).map((team) => (
                <div key={team.name} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-neutral-800 dark:text-neutral-300">
                  <div className="flex items-center justify-between text-slate-700 dark:text-neutral-200">
                    <span className="font-semibold">{team.name}</span>
                    <span>{toPercent(Math.min(team.utilisation, 1))}{team.utilisation > 1 ? '+' : ''}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-800">
                    <div
                      className={`${team.utilisation > 1 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full`}
                      style={{ width: `${Math.min(team.utilisation, 1.25) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                    Planlanan {formatHours(team.required)} · Kapasite {formatHours(team.baseline)}
                  </p>
                </div>
              ))}
            </div>
            {bottlenecks.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-neutral-800">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">Darboğaz Uyarıları</h5>
                <div className="mt-2 space-y-2">
                  {bottlenecks.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        item.severity === 'critical'
                          ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-200'
                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{item.label}</span>
                        <span>{item.severity === 'critical' ? 'Kritik' : 'Uyarı'}</span>
                      </div>
                      <p className="mt-1 text-[11px]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {insights && insights.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Otomasyon İçgörüleri</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {insights.map((insight) => (
              <InsightBadge key={insight.id} insight={insight} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ReportsTab;
