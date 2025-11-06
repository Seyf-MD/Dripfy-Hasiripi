import * as React from 'react';
import type {
  AbTestExperiment,
  CampaignPerformance,
  CampaignComparisonInsight,
} from '../../types';

interface ReportsTabProps {
  experiments: AbTestExperiment[];
  campaigns: CampaignPerformance[];
  insights?: CampaignComparisonInsight[];
}

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

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

const ReportsTab: React.FC<ReportsTabProps> = ({ experiments, campaigns, insights }) => {
  const sortedExperiments = React.useMemo(() => experiments.slice().sort((a, b) => (a.status === 'running' ? -1 : 1)), [experiments]);
  const sortedCampaigns = React.useMemo(() => campaigns.slice().sort((a, b) => computeRom(b) - computeRom(a)), [campaigns]);

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
