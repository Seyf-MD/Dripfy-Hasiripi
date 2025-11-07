import type { ScheduleEvent } from '../../types';

export type ConflictSeverity = 'low' | 'medium' | 'high';
export type ConflictType = 'capacity_overflow' | 'participant_overlap' | 'location_overlap';

export interface ConflictSuggestion {
  id: string;
  title: string;
  description?: string;
}

export interface PlanningConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  day: ScheduleEvent['day'];
  eventIds: string[];
  teamId?: string;
  locationId?: string;
  participants?: string[];
  overflowHours?: number;
  suggestions: ConflictSuggestion[];
}

const MINUTES_IN_DAY = 24 * 60;

function parseTimeToMinutes(time: string): number {
  if (!time) {
    return 0;
  }
  const [hour, minute = '0'] = time.split(':');
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
    return 0;
  }
  return parsedHour * 60 + parsedMinute;
}

function getEventDurationMinutes(event: ScheduleEvent): number {
  const required = event.capacity?.requiredHours ?? 0;
  const allocated = event.capacity?.allocatedHours ?? 0;
  const hours = Math.max(required, allocated, 0.5);
  return Math.round(hours * 60);
}

function createCapacityConflict(
  teamId: string | undefined,
  day: ScheduleEvent['day'],
  eventIds: string[],
  overflow: number,
): PlanningConflict {
  return {
    id: `capacity-${teamId ?? 'unknown'}-${day}`,
    type: 'capacity_overflow',
    severity: overflow > 2 ? 'high' : overflow > 1 ? 'medium' : 'low',
    message: `Ekip kapasitesi ${overflow.toFixed(1)} saat aşıldı (${day}).`,
    day,
    eventIds,
    teamId,
    overflowHours: overflow,
    suggestions: [
      {
        id: 'redistribute-workload',
        title: 'Yükü yeniden dağıtın',
        description: 'Yoğunluğu azaltmak için etkinlikleri diğer günlere veya ekiplere kaydırın.',
      },
      {
        id: 'add-support',
        title: 'Geçici destek ekleyin',
        description: 'Yoğun gün için ek ekip üyesi ya da esnek kaynak atayın.',
      },
    ],
  };
}

function createOverlapConflict(
  type: ConflictType,
  day: ScheduleEvent['day'],
  eventIds: string[],
  label: string,
  identifier?: string,
): PlanningConflict {
  const severity: ConflictSeverity = eventIds.length > 2 ? 'high' : 'medium';
  const description =
    type === 'participant_overlap'
      ? `${label} aynı saat diliminde birden fazla etkinliğe atanmış.`
      : `${label} lokasyonu aynı saatlerde birden fazla etkinlik için planlandı.`;
  return {
    id: `${type}-${label}-${day}`,
    type,
    severity,
    message: description,
    day,
    eventIds,
    ...(type === 'participant_overlap'
      ? { participants: [label] }
      : { locationId: identifier ?? label }),
    suggestions: [
      {
        id: 'shift-time',
        title: 'Saatleri kaydırın',
        description: 'Çakışan etkinlikleri 30-60 dakika ileri/geri alarak çakışmayı kaldırın.',
      },
      {
        id: 'delegate',
        title: 'Yeni sorumlu atayın',
        description: 'Etkinliklerden birini farklı bir katılımcı veya mekâna yönlendirin.',
      },
    ],
  };
}

interface TimedEventWindow {
  event: ScheduleEvent;
  start: number;
  end: number;
}

type ParticipantDayMap = Map<ScheduleEvent['day'], Map<string, TimedEventWindow[]>>;
type LocationDayMap = Map<ScheduleEvent['day'], Map<string, { label: string; events: TimedEventWindow[] }>>;

export function detectPlanningConflicts(events: ScheduleEvent[]): PlanningConflict[] {
  if (!events || events.length === 0) {
    return [];
  }

  const conflicts: PlanningConflict[] = [];
  const teamDayMap = new Map<ScheduleEvent['day'], Map<string, { total: number; eventIds: string[] }>>();
  const teamCapacityMap = new Map<string, number>();

  events.forEach((event) => {
    const teamKey = event.team?.id || event.team?.name || 'unknown-team';
    const dayMap = teamDayMap.get(event.day) ?? new Map();
    const current = dayMap.get(teamKey) ?? { total: 0, eventIds: [] };
    current.total += event.capacity?.requiredHours ?? 0;
    current.eventIds.push(event.id);
    dayMap.set(teamKey, current);
    teamDayMap.set(event.day, dayMap);

    if (!teamCapacityMap.has(teamKey)) {
      const baseline = event.team?.capacityHoursPerDay;
      const fallback = (event.team?.members?.length ?? 1) * 6;
      teamCapacityMap.set(teamKey, baseline && baseline > 0 ? baseline : fallback);
    }
  });

  teamDayMap.forEach((dayMap, day) => {
    dayMap.forEach((value, teamKey) => {
      const capacity = teamCapacityMap.get(teamKey) ?? 8;
      const overflow = value.total - capacity;
      if (overflow > 0.25) {
        conflicts.push(createCapacityConflict(teamKey, day, value.eventIds, overflow));
      }
    });
  });

  const participantDayMap: ParticipantDayMap = new Map();
  const locationDayMap: LocationDayMap = new Map();

  events.forEach((event) => {
    const start = parseTimeToMinutes(event.time);
    const end = Math.min(MINUTES_IN_DAY, start + getEventDurationMinutes(event));
    const window: TimedEventWindow = { event, start, end };

    const participantMap = participantDayMap.get(event.day) ?? new Map();
    event.participants.forEach((participant) => {
      const list = participantMap.get(participant) ?? [];
      list.push(window);
      participantMap.set(participant, list);
    });
    participantDayMap.set(event.day, participantMap);

    const locationIdentifier = event.location?.id || event.location?.name || 'unknown-location';
    const locationLabel = event.location?.name || locationIdentifier;
    const locationMap = locationDayMap.get(event.day) ?? new Map();
    const record = locationMap.get(locationIdentifier) ?? { label: locationLabel, events: [] };
    record.label = locationLabel;
    record.events.push(window);
    locationMap.set(locationIdentifier, record);
    locationDayMap.set(event.day, locationMap);
  });

  participantDayMap.forEach((participantMap, day) => {
    participantMap.forEach((windows, participant) => {
      const overlaps: Set<string> = new Set();
      const sorted = windows.slice().sort((a, b) => a.start - b.start);
      for (let index = 1; index < sorted.length; index += 1) {
        const prev = sorted[index - 1];
        const current = sorted[index];
        if (current.start < prev.end) {
          overlaps.add(prev.event.id);
          overlaps.add(current.event.id);
        }
      }
      if (overlaps.size > 0) {
        conflicts.push(
          createOverlapConflict('participant_overlap', day, Array.from(overlaps), participant),
        );
      }
    });
  });

  locationDayMap.forEach((locationMap, day) => {
    locationMap.forEach(({ label, events: windows }, locationKey) => {
      const overlaps: Set<string> = new Set();
      const sorted = windows.slice().sort((a, b) => a.start - b.start);
      for (let index = 1; index < sorted.length; index += 1) {
        const prev = sorted[index - 1];
        const current = sorted[index];
        if (current.start < prev.end) {
          overlaps.add(prev.event.id);
          overlaps.add(current.event.id);
        }
      }
      if (overlaps.size > 0) {
        conflicts.push(
          createOverlapConflict('location_overlap', day, Array.from(overlaps), label || locationKey, locationKey),
        );
      }
    });
  });

  return conflicts;
}

