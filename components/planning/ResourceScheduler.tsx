import * as React from 'react';
import { AlertTriangle, BarChart2, CalendarRange, MapPin } from 'lucide-react';

import type { CapacitySnapshot, ScheduleEvent } from '../../types';
import {
  detectPlanningConflicts,
  type PlanningConflict,
} from '../../services/planning/conflictDetector';

interface ResourceSchedulerProps {
  events: ScheduleEvent[];
  capacitySnapshots?: CapacitySnapshot[];
  className?: string;
}

type DayLabel = ScheduleEvent['day'];

interface DayLoad {
  planned: number;
  allocated: number;
  events: ScheduleEvent[];
}

interface TeamSummary {
  key: string;
  team: ScheduleEvent['team'];
  events: ScheduleEvent[];
  baseline: number;
  totalPlanned: number;
  totalAllocated: number;
  dayLoad: Map<DayLabel, DayLoad>;
  averageUtilisation: number;
  peakUtilisation: { day: DayLabel; ratio: number; load: DayLoad } | null;
}

const DAY_SEQUENCE: DayLabel[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS: Record<DayLabel, string> = {
  Monday: 'Pzt',
  Tuesday: 'Sal',
  Wednesday: 'Çar',
  Thursday: 'Per',
  Friday: 'Cum',
  Saturday: 'Cmt',
  Sunday: 'Paz',
};

const MINUTES_IN_DAY = 24 * 60;

function timeToMinutes(time: string): number {
  if (!time) {
    return 0;
  }
  const [hour, minute = '0'] = time.split(':');
  const hours = Number(hour);
  const minutes = Number(minute);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function getBaselineCapacity(team: ScheduleEvent['team'] | undefined): number {
  if (!team) {
    return 8;
  }
  if (team.capacityHoursPerDay && team.capacityHoursPerDay > 0) {
    return team.capacityHoursPerDay;
  }
  const memberFallback = (team.members?.length ?? 1) * 6;
  return Math.max(memberFallback, 6);
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildTeamSummaries(events: ScheduleEvent[]): TeamSummary[] {
  const map = new Map<string, TeamSummary>();

  events.forEach((event) => {
    const teamKey = event.team?.id || event.team?.name || `team-${event.id}`;
    if (!map.has(teamKey)) {
      map.set(teamKey, {
        key: teamKey,
        team: event.team,
        events: [],
        baseline: getBaselineCapacity(event.team),
        totalPlanned: 0,
        totalAllocated: 0,
        dayLoad: new Map<DayLabel, DayLoad>(),
        averageUtilisation: 0,
        peakUtilisation: null,
      });
    }

    const summary = map.get(teamKey)!;
    summary.events.push(event);
    summary.totalPlanned += event.capacity?.requiredHours ?? 0;
    summary.totalAllocated += event.capacity?.allocatedHours ?? 0;
    const load = summary.dayLoad.get(event.day) ?? { planned: 0, allocated: 0, events: [] };
    load.planned += event.capacity?.requiredHours ?? 0;
    load.allocated += event.capacity?.allocatedHours ?? 0;
    load.events.push(event);
    summary.dayLoad.set(event.day, load);
  });

  return Array.from(map.values()).map((summary) => {
    const totalAllocated = Array.from(summary.dayLoad.values()).reduce((acc, load) => acc + load.allocated, 0);
    const dayCount = summary.dayLoad.size || 1;
    summary.averageUtilisation = summary.baseline > 0 ? totalAllocated / (summary.baseline * dayCount) : 0;

    let peak: TeamSummary['peakUtilisation'] = null;
    summary.dayLoad.forEach((load, day) => {
      const ratio = summary.baseline > 0 ? load.allocated / summary.baseline : 0;
      if (!peak || ratio > peak.ratio) {
        peak = { day, ratio, load };
      }
    });
    summary.peakUtilisation = peak;
    return summary;
  }).sort((a, b) => {
    const nameA = a.team?.name ?? a.key;
    const nameB = b.team?.name ?? b.key;
    return nameA.localeCompare(nameB);
  });
}

const severityTone: Record<PlanningConflict['severity'], string> = {
  high: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  low: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200',
};

const severityBadge: Record<PlanningConflict['severity'], string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-200',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-200',
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-200',
};

const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({ events, capacitySnapshots = [], className }) => {
  const [viewMode, setViewMode] = React.useState<'timeline' | 'load'>('timeline');

  const eventMap = React.useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const conflicts = React.useMemo(() => detectPlanningConflicts(events), [events]);
  const teamSummaries = React.useMemo(() => buildTeamSummaries(events), [events]);
  const sortedSnapshots = React.useMemo(
    () => capacitySnapshots.slice().sort((a, b) => (b.utilisation ?? 0) - (a.utilisation ?? 0)),
    [capacitySnapshots],
  );

  const renderConflicts = () => {
    if (conflicts.length === 0) {
      return null;
    }
    return (
      <div className="mt-4 space-y-3">
        {conflicts.map((conflict) => {
          const relatedEvents = conflict.eventIds
            .map((id) => eventMap.get(id))
            .filter(Boolean) as ScheduleEvent[];
          return (
            <div
              key={conflict.id}
              className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${severityTone[conflict.severity]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span className="font-semibold">{conflict.message}</span>
                  </div>
                  {relatedEvents.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-neutral-300">
                      {relatedEvents.map((event) => (
                        <li key={event.id} className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          <span>{event.title} · {event.time}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${severityBadge[conflict.severity]}`}>
                  {conflict.severity === 'high' ? 'Kritik' : conflict.severity === 'medium' ? 'Uyarı' : 'Bilgi'}
                </span>
              </div>
              {conflict.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    Önerilen Aksiyonlar
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {conflict.suggestions.map((suggestion) => (
                      <span
                        key={suggestion.id}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                      >
                        {suggestion.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineView = () => {
    if (teamSummaries.length === 0) {
      return (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-300">
          Planlanmış etkinlik bulunmuyor.
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-6">
        {teamSummaries.map((summary) => {
          const baseline = summary.baseline || 8;
          return (
            <div key={summary.key} className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-neutral-800">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">{summary.team?.name || 'Ekip atanmamış'}</h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {summary.team?.members?.length ?? 0} üye · Günlük kapasite {baseline} saat
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-neutral-400">
                    <p>Planlanan: {summary.totalPlanned.toFixed(1)} saat</p>
                    <p>Bloke: {summary.totalAllocated.toFixed(1)} saat</p>
                  </div>
                </div>
                {summary.team?.members && summary.team.members.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                    {summary.team.members.map((member) => (
                      <span key={member} className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-neutral-800">
                        {member}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[840px] px-5 py-4">
                  <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">
                    {DAY_SEQUENCE.map((day) => (
                      <div key={day} className="text-center">{DAY_LABELS[day]}</div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {DAY_SEQUENCE.map((day) => {
                      const load = summary.dayLoad.get(day);
                      const eventsForDay = load?.events ?? [];
                      return (
                        <div key={`${summary.key}-${day}`} className="relative h-28 rounded-xl border border-slate-100 bg-slate-50 dark:border-neutral-800 dark:bg-neutral-800/60">
                          {eventsForDay.length === 0 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 dark:text-neutral-500">
                              Boş
                            </span>
                          ) : (
                            eventsForDay.map((event) => {
                              const start = timeToMinutes(event.time);
                              const durationMinutes = Math.round(Math.max(event.capacity?.allocatedHours ?? 0, event.capacity?.requiredHours ?? 0, 0.5) * 60);
                              const left = clamp((start / MINUTES_IN_DAY) * 100, 0, 100);
                              const width = clamp((durationMinutes / MINUTES_IN_DAY) * 100, 6, 100 - left);
                              const utilisation = baseline > 0 ? clamp((event.capacity?.allocatedHours ?? event.capacity?.requiredHours ?? 0) / baseline, 0, 1) : 0;
                              return (
                                <div
                                  key={event.id}
                                  className="absolute top-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-500/40 dark:bg-emerald-500/25 dark:text-emerald-100"
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="truncate font-semibold">{event.title}</span>
                                    <span>{event.time}</span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-800/80 dark:text-emerald-100/80">
                                    <span className="truncate flex-1">{event.location?.name ?? 'Lokasyon yok'}</span>
                                    <span>{toPercent(utilisation)}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLoadView = () => {
    return (
      <div className="mt-6 space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {teamSummaries.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-300">
              Kapasite hesaplanacak etkinlik bulunmuyor.
            </div>
          )}
          {teamSummaries.map((summary) => {
            const average = clamp(summary.averageUtilisation, 0, 1);
            const peakRatio = clamp(summary.peakUtilisation?.ratio ?? 0, 0, 1.5);
            const peakDay = summary.peakUtilisation?.day;
            return (
              <div key={summary.key} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">{summary.team?.name || 'Ekip atanmamış'}</h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">{summary.team?.members?.length ?? 0} üye · Kapasite {summary.baseline} saat/gün</p>
                  </div>
                  <BarChart2 size={18} className="text-emerald-500" />
                </div>
                <div className="mt-3 space-y-3 text-xs text-slate-600 dark:text-neutral-300">
                  <div>
                    <div className="flex justify-between">
                      <span>Ortalama Kullanım</span>
                      <span>{toPercent(average)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${clamp(average, 0, 1) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span>Tepe Yük</span>
                      <span>{toPercent(Math.min(peakRatio, 1))}{peakRatio > 1 ? ' +' : ''}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-800">
                      <div
                        className={`${peakRatio > 1 ? 'bg-red-500' : 'bg-amber-500'} h-full rounded-full`}
                        style={{ width: `${clamp(peakRatio, 0, 1.25) * 100}%` }}
                      />
                    </div>
                    {peakDay && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                        En yoğun gün: {DAY_LABELS[peakDay]} · {summary.peakUtilisation?.load.allocated.toFixed(1)} saat
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                      <p className="font-semibold text-slate-700 dark:text-neutral-200">Toplam Planlanan</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{summary.totalPlanned.toFixed(1)}s</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
                      <p className="font-semibold text-slate-700 dark:text-neutral-200">Toplam Bloke</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{summary.totalAllocated.toFixed(1)}s</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedSnapshots.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white">Lokasyon Kapasite Panosu</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedSnapshots.map((snapshot) => {
                const utilisation = clamp(snapshot.utilisation ?? 0, 0, 1.5);
                return (
                  <div key={snapshot.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-neutral-100">{snapshot.unitLabel}</p>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400">Toplam {snapshot.totalCapacity} saat · Bloke {snapshot.allocated} saat</p>
                      </div>
                      <MapPin size={16} className="text-emerald-500" />
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-neutral-400">
                        <span>Kapasite Kullanımı</span>
                        <span>{toPercent(Math.min(utilisation, 1))}{utilisation > 1 ? ' +' : ''}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-700">
                        <div
                          className={`${utilisation > 1 ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full`}
                          style={{ width: `${clamp(utilisation, 0, 1.25) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                      <div>
                        <span>Uygun: </span>
                        <span className="font-semibold text-slate-700 dark:text-neutral-200">{snapshot.available}</span>
                      </div>
                      <div>
                        <span>Backlog: </span>
                        <span className="font-semibold text-slate-700 dark:text-neutral-200">{snapshot.backlog}</span>
                      </div>
                    </div>
                    {snapshot.notes && (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-neutral-300">{snapshot.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70 ${className ?? ''}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kaynak Planlama Görünümü</h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            Ekiplerin günlük kapasite dağılımını Gantt benzeri zaman çizelgesi veya yük grafikleriyle inceleyin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/60 p-1 text-xs font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${viewMode === 'timeline' ? 'bg-white text-emerald-600 shadow dark:bg-neutral-700 dark:text-emerald-300' : 'hover:bg-white/80 dark:hover:bg-neutral-700/60'}`}
            >
              <CalendarRange size={14} /> Zaman Çizelgesi
            </button>
            <button
              type="button"
              onClick={() => setViewMode('load')}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 transition ${viewMode === 'load' ? 'bg-white text-emerald-600 shadow dark:bg-neutral-700 dark:text-emerald-300' : 'hover:bg-white/80 dark:hover:bg-neutral-700/60'}`}
            >
              <BarChart2 size={14} /> Kapasite Yükü
            </button>
          </div>
        </div>
      </div>

      {renderConflicts()}

      {viewMode === 'timeline' ? renderTimelineView() : renderLoadView()}
    </section>
  );
};

export default ResourceScheduler;

