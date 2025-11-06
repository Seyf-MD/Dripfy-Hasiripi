import * as React from 'react';
import { Mail, Bell, Sparkles } from 'lucide-react';
import {
  Contact,
  RelationshipTimelineEvent,
  SegmentCampaignRecommendation,
  SegmentDefinition,
  SegmentPerformanceMetric,
} from '../../types';
import { autoAssignSegments } from '../../services/segments/rulesEngine';
import {
  buildSegmentEmailExport,
  buildSegmentNotificationExport,
  triggerDownload,
} from '../../services/segments/exporters';
import { useLanguage } from '../../i18n/LanguageContext';

interface SegmentViewProps {
  contacts: Contact[];
  segments: SegmentDefinition[];
  performance: SegmentPerformanceMetric[];
  timeline: RelationshipTimelineEvent[];
  recommendations: SegmentCampaignRecommendation[];
}

const formatDateTime = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const SegmentView: React.FC<SegmentViewProps> = ({
  contacts,
  segments,
  performance,
  timeline,
  recommendations,
}) => {
  const { t, language } = useLanguage();
  const evaluatedContacts = React.useMemo(() => autoAssignSegments(contacts, segments), [contacts, segments]);
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(segments[0]?.id ?? null);

  React.useEffect(() => {
    if (segments.length > 0 && !selectedSegmentId) {
      setSelectedSegmentId(segments[0].id);
    }
  }, [segments, selectedSegmentId]);

  const activeSegment = React.useMemo(
    () => segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0] ?? null,
    [segments, selectedSegmentId],
  );

  const activePerformance = React.useMemo(
    () => performance.find((item) => item.segmentId === activeSegment?.id) ?? null,
    [performance, activeSegment],
  );

  const activeContacts = React.useMemo(
    () =>
      selectedSegmentId
        ? evaluatedContacts.filter((contact) => (contact.segmentIds ?? []).includes(selectedSegmentId))
        : evaluatedContacts,
    [evaluatedContacts, selectedSegmentId],
  );

  const positionedContacts = React.useMemo(() => {
    if (activeContacts.length === 0) {
      return [];
    }
    const maxNodes = Math.min(activeContacts.length, 8);
    const radius = 110;
    return activeContacts.slice(0, maxNodes).map((contact, index) => {
      const angle = (index / maxNodes) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return {
        contact,
        style: {
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
        } as React.CSSProperties,
      };
    });
  }, [activeContacts]);

  const timelineEvents = React.useMemo(
    () =>
      selectedSegmentId
        ? timeline
            .filter((event) => event.segmentIds.includes(selectedSegmentId))
            .slice()
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        : [],
    [timeline, selectedSegmentId],
  );

  const activeRecommendations = React.useMemo(
    () =>
      selectedSegmentId
        ? recommendations.filter((item) => item.segmentId === selectedSegmentId)
        : [],
    [recommendations, selectedSegmentId],
  );

  const handleExportEmail = React.useCallback(() => {
    if (!activeSegment) {
      return;
    }
    const result = buildSegmentEmailExport(activeContacts, activeSegment, { includeHeader: true });
    triggerDownload(result);
  }, [activeContacts, activeSegment]);

  const handleExportNotification = React.useCallback(() => {
    if (!activeSegment) {
      return;
    }
    const result = buildSegmentNotificationExport(activeContacts, activeSegment);
    triggerDownload(result);
  }, [activeContacts, activeSegment]);

  if (!activeSegment) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('segments.tabLabel')}</h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400">{t('segments.overviewSubtitle', 'Segment bazlı ilişki zekasını inceleyin')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedSegmentId ?? ''}
            onChange={(event) => setSelectedSegmentId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportEmail}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
            >
              <Mail size={16} />
              {t('segments.emailExport')}
            </button>
            <button
              type="button"
              onClick={handleExportNotification}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
            >
              <Bell size={16} />
              {t('segments.notificationExport')}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('segments.360Title')}</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.360Subtitle', 'Segment üyeleri ve temas yoğunluğu')}</p>
          <div className="relative mt-6 h-72">
            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-100 text-center text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span>{activeSegment.name}</span>
            </div>
            {positionedContacts.map(({ contact, style }) => (
              <div
                key={contact.id}
                style={style}
                className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-slate-200 bg-white text-xs text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <span className="text-sm font-semibold">{contact.firstName.slice(0, 1)}{contact.lastName.slice(0, 1)}</span>
                <span className="text-[10px] text-slate-400 dark:text-neutral-400">{contact.city ?? contact.role}</span>
              </div>
            ))}
            {activeContacts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-neutral-500">
                {t('segments.noContacts', 'Bu segmentte henüz kişi yok.')}
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('segments.timelineTitle')}</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.timelineSubtitle', 'Son temasların kronolojisi')}</p>
          <div className="mt-4 space-y-4">
            {timelineEvents.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.noTimeline')}</p>
            )}
            {timelineEvents.map((event) => (
              <article key={event.id} className="relative pl-4 text-sm">
                <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                <header className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
                  <span className="font-medium text-slate-700 dark:text-neutral-200">{formatDateTime(event.occurredAt, language)}</span>
                  <span>{t(`segments.channel.${event.channel}`, event.channel)}</span>
                </header>
                <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{event.summary}</p>
                {event.owner && (
                  <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.ownerLabel', 'Sorumlu')}: {event.owner}</p>
                )}
                {event.followUp && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">{event.followUp}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
        <header className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('segments.recommendationsTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">{t('segments.recommendationsSubtitle', 'Aktif segment önerileri')}</p>
          </div>
        </header>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {activeRecommendations.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
              <header className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{rec.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">{rec.suggestedChannels.join(' · ')}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {formatPercent(rec.expectedLift)}
                </span>
              </header>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-300">{rec.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-neutral-400">
                <div>
                  <dt>{t('segments.audienceSize')}</dt>
                  <dd className="font-semibold text-slate-800 dark:text-neutral-200">{rec.audienceSize}</dd>
                </div>
                {rec.recommendedSendDate && (
                  <div>
                    <dt>{t('segments.nextAction')}</dt>
                    <dd className="font-semibold text-slate-800 dark:text-neutral-200">{formatDateTime(rec.recommendedSendDate, language)}</dd>
                  </div>
                )}
                {rec.cta && (
                  <div className="col-span-2 text-slate-600 dark:text-neutral-300">{rec.cta}</div>
                )}
              </dl>
            </div>
          ))}
          {activeRecommendations.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
              {t('segments.noRecommendations')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SegmentView;
