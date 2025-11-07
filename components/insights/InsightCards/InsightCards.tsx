import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Bot,
  ClipboardPlus,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react';
import { useUserContext } from '../../../context/UserContext';
import { executeInsightAction } from '../../../services/insights';
import { selectInsightsForAudience } from '../../../services/insights/personalization';
import type { InsightActionOption, InsightRecord } from '../../../types';
import type { InsightWarehouseSummary } from '../../../datawarehouse/insights/schema';

const CATEGORY_META: Record<InsightRecord['category'], { label: string; icon: React.ReactNode; accent: string }> = {
  finance: {
    label: 'Finans',
    icon: <TrendingDown className="h-5 w-5" />,
    accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10',
  },
  operations: {
    label: 'Operasyon',
    icon: <ClipboardPlus className="h-5 w-5" />,
    accent: 'text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10',
  },
  capacity: {
    label: 'Kapasite',
    icon: <Gauge className="h-5 w-5" />,
    accent: 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-500/10',
  },
  customer: {
    label: 'Müşteri',
    icon: <Users className="h-5 w-5" />,
    accent: 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10',
  },
};

const SEVERITY_META = {
  critical: {
    label: 'Kritik',
    tone: 'border-red-500 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  high: {
    label: 'Yüksek',
    tone: 'border-orange-400 text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  medium: {
    label: 'Orta',
    tone: 'border-amber-400 text-amber-600 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10',
    icon: <Sparkles className="h-4 w-4" />,
  },
  low: {
    label: 'Düşük',
    tone: 'border-slate-300 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-500/10',
    icon: <Sparkles className="h-4 w-4" />,
  },
  info: {
    label: 'Bilgi',
    tone: 'border-slate-200 text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-500/10',
    icon: <Lightbulb className="h-4 w-4" />,
  },
} as const;

interface InsightCardsProps {
  insights: InsightRecord[];
  isLoading?: boolean;
  limit?: number;
  onActionExecuted?: (args: { insight: InsightRecord; action: InsightActionOption; ok: boolean }) => void;
  summary?: InsightWarehouseSummary | null;
  onRefresh?: () => void;
  error?: string | null;
}

const InsightCards: React.FC<InsightCardsProps> = ({
  insights,
  isLoading = false,
  limit,
  onActionExecuted,
  summary,
  onRefresh,
  error,
}) => {
  const { user, operationalRole, department } = useUserContext();
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | InsightRecord['category']>('all');
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ message: string; tone: 'success' | 'warning' | 'error' } | null>(null);

  const personalizationContext = React.useMemo(
    () => ({
      role: user?.role ?? null,
      operationalRole: operationalRole ?? null,
      department: department ?? null,
      tags: [] as string[],
    }),
    [user?.role, operationalRole, department],
  );

  const visibleInsights = React.useMemo(() => {
    const personalised = selectInsightsForAudience(insights, personalizationContext, { limit });
    if (selectedCategory === 'all') {
      return personalised;
    }
    return personalised.filter((insight) => insight.category === selectedCategory);
  }, [insights, personalizationContext, selectedCategory, limit]);

  React.useEffect(() => {
    if (!feedback) {
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleExecuteAction = React.useCallback(
    async (insight: InsightRecord, action: InsightActionOption) => {
      setPendingAction(action.id);
      try {
        const result = await executeInsightAction({ insight, action });
        setFeedback({ message: result.message, tone: result.ok ? 'success' : 'warning' });
        onActionExecuted?.({ insight, action, ok: result.ok });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Aksiyon uygulanamadı.';
        setFeedback({ message, tone: 'error' });
      } finally {
        setPendingAction(null);
      }
    },
    [onActionExecuted],
  );

  const totals = summary?.totals;

  const renderSignals = (insight: InsightRecord) => {
    if (!insight.signals?.length) {
      return null;
    }
    return (
      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {insight.signals.slice(0, 4).map((signal) => (
          <div key={`${insight.id}-${signal.metric}`} className="flex flex-col rounded-md bg-slate-50 dark:bg-slate-800/40 p-2">
            <dt className="font-medium text-slate-600 dark:text-slate-300">{signal.metric}</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {signal.value}
              {signal.unit ? ` ${signal.unit}` : ''}
              {typeof signal.delta === 'number' ? (
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                  Δ {signal.delta > 0 ? '+' : ''}{signal.delta}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderActions = (insight: InsightRecord) => {
    if (!insight.actions?.length) {
      return null;
    }
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {insight.actions.map((action) => {
          const isPending = pendingAction === action.id;
          const icon = (() => {
            switch (action.type) {
              case 'task':
                return <ClipboardPlus className="h-4 w-4" />;
              case 'chatbot':
                return <Bot className="h-4 w-4" />;
              case 'notification':
                return <BellRing className="h-4 w-4" />;
              case 'automation':
                return <Sparkles className="h-4 w-4" />;
              default:
                return <Lightbulb className="h-4 w-4" />;
            }
          })();
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleExecuteAction(insight, action)}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Insight’lar yükleniyor…</span>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Öncelikli insight’lar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Finans, görev, kapasite ve müşteri sinyallerini tek yerde toplayın.
          </p>
          {summary?.generatedAt ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Son güncelleme:{' '}
              {new Date(summary.generatedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500"
              >
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            ) : null}
            {(['all', 'finance', 'operations', 'capacity', 'customer'] as const).map((category) => {
              const active = selectedCategory === category;
              const meta = category === 'all' ? null : CATEGORY_META[category];
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {category === 'all' ? <Sparkles className="h-4 w-4" /> : meta?.icon}
                  <span>{category === 'all' ? 'Tümü' : meta?.label}</span>
                </button>
              );
            })}
          </div>
          {totals ? (
            <div className="flex flex-wrap justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
              {(['finance', 'operations', 'capacity', 'customer'] as const).map((category) => {
                const count = totals[category];
                if (!count) {
                  return null;
                }
                const meta = CATEGORY_META[category];
                return (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {meta.label}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{count}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300'
              : feedback.tone === 'warning'
                ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border-red-400 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-300'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {visibleInsights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
          Seçilen kriterlere göre gösterilecek insight bulunamadı.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleInsights.map((insight) => {
            const categoryMeta = CATEGORY_META[insight.category];
            const severityMeta = SEVERITY_META[insight.severity];
            return (
              <article
                key={insight.id}
                className="relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${categoryMeta.accent}`}>
                      {categoryMeta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        <span>{categoryMeta.label}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {severityMeta.icon}
                          {severityMeta.label}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{insight.title}</h3>
                    </div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityMeta.tone}`}>
                    Güven {Math.round(insight.confidence * 100)}%
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{insight.summary}</p>

                {insight.narrative ? (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/40 dark:text-slate-300">
                    {insight.narrative}
                  </p>
                ) : null}

                {renderSignals(insight)}

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Skor {Math.round(insight.score * 100)} / 100
                    </span>
                    {insight.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <time dateTime={insight.generatedAt} className="font-medium text-slate-500 dark:text-slate-300">
                    {new Date(insight.generatedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </time>
                </div>

                {renderActions(insight)}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default InsightCards;
