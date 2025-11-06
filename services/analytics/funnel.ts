import {
  type SignupFunnelDataset,
  type SignupFunnelFilters,
  type SignupFunnelResult,
  type SignupFunnelStageMetrics,
  type SignupFunnelBreakdownRow,
  type SignupFunnelSegmentType,
} from '../../types';

interface StageDurationAccumulator {
  totalMs: number;
  count: number;
}

interface LeadBreakdownEntry {
  leads: Set<string>;
  converted: Set<string>;
  dropOffCounts: Map<string, number>;
}

const UNKNOWN_LABEL = 'Bilinmiyor';

function parseDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function ensureBreakdownEntry(map: Map<string, LeadBreakdownEntry>, key: string): LeadBreakdownEntry {
  if (!map.has(key)) {
    map.set(key, { leads: new Set(), converted: new Set(), dropOffCounts: new Map() });
  }
  return map.get(key)!;
}

function formatRate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) {
    return 0;
  }
  const rate = numerator / denominator;
  return Number.isFinite(rate) ? Number((rate * 100).toFixed(1)) : 0;
}

export function listAvailableSignupFunnelSegments(dataset: SignupFunnelDataset): Record<SignupFunnelSegmentType, string[]> {
  const segments: Record<SignupFunnelSegmentType, Set<string>> = {
    source: new Set(),
    campaign: new Set(),
    country: new Set(),
  };

  dataset.events.forEach((event) => {
    segments.source.add(event.source ?? UNKNOWN_LABEL);
    segments.campaign.add(event.campaign ?? UNKNOWN_LABEL);
    segments.country.add(event.country ?? UNKNOWN_LABEL);
  });

  return {
    source: Array.from(segments.source).sort(),
    campaign: Array.from(segments.campaign).sort(),
    country: Array.from(segments.country).sort(),
  };
}

export function calculateSignupFunnel(
  dataset: SignupFunnelDataset,
  filters: SignupFunnelFilters = {}
): SignupFunnelResult {
  const orderedStages = [...dataset.stages].sort((a, b) => a.order - b.order);
  const stageOrder = new Map(orderedStages.map((stage, index) => [stage.id, stage.order ?? index]));
  const stageLeadSets = new Map<string, Set<string>>();
  const stageDurations = new Map<string, StageDurationAccumulator>();
  orderedStages.forEach((stage) => {
    stageLeadSets.set(stage.id, new Set());
    stageDurations.set(stage.id, { totalMs: 0, count: 0 });
  });

  const eventsByLead = new Map<string, typeof dataset.events>();
  const startBoundary = parseDate(filters.startDate ?? null);
  const endBoundary = parseDate(filters.endDate ?? null);

  dataset.events.forEach((event) => {
    const occurredAt = parseDate(event.occurredAt);
    if (startBoundary && occurredAt && occurredAt < startBoundary) {
      return;
    }
    if (endBoundary && occurredAt && occurredAt > endBoundary) {
      return;
    }
    if (!eventsByLead.has(event.leadId)) {
      eventsByLead.set(event.leadId, []);
    }
    eventsByLead.get(event.leadId)!.push(event);
  });

  const segmentFilter = filters.segment;
  const breakdownMaps: Record<SignupFunnelSegmentType, Map<string, LeadBreakdownEntry>> = {
    source: new Map(),
    campaign: new Map(),
    country: new Map(),
  };

  let totalConversionTimeMs = 0;
  let conversionCount = 0;

  eventsByLead.forEach((leadEvents, leadId) => {
    const sorted = leadEvents
      .slice()
      .sort((a, b) => {
        const orderA = stageOrder.get(a.stageId) ?? Number.MAX_SAFE_INTEGER;
        const orderB = stageOrder.get(b.stageId) ?? Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return parseDate(a.occurredAt)! - parseDate(b.occurredAt)!;
        }
        return orderA - orderB;
      });

    if (sorted.length === 0) {
      return;
    }

    const firstEvent = sorted[0];
    const matchesSegment = (() => {
      if (!segmentFilter) {
        return true;
      }
      const comparisonValue =
        segmentFilter.type === 'source'
          ? firstEvent.source
          : segmentFilter.type === 'campaign'
          ? firstEvent.campaign
          : firstEvent.country;
      return (comparisonValue ?? UNKNOWN_LABEL) === (segmentFilter.value || UNKNOWN_LABEL);
    })();

    if (!matchesSegment) {
      return;
    }

    const stageSet = new Set(sorted.map((event) => event.stageId));

    sorted.forEach((event) => {
      stageLeadSets.get(event.stageId)?.add(leadId);
    });

    for (let index = 0; index < orderedStages.length - 1; index += 1) {
      const currentStage = orderedStages[index];
      const nextStage = orderedStages[index + 1];
      const currentEvent = sorted.find((event) => event.stageId === currentStage.id);
      const nextEvent = sorted.find((event) => event.stageId === nextStage.id);
      if (currentEvent && nextEvent) {
        const currentAt = parseDate(currentEvent.occurredAt);
        const nextAt = parseDate(nextEvent.occurredAt);
        if (currentAt !== null && nextAt !== null && nextAt >= currentAt) {
          const accumulator = stageDurations.get(currentStage.id);
          if (accumulator) {
            accumulator.totalMs += nextAt - currentAt;
            accumulator.count += 1;
          }
        }
      }
    }

    const lastStage = orderedStages[orderedStages.length - 1];
    const firstStage = orderedStages[0];
    const firstStageEvent = sorted.find((event) => event.stageId === firstStage.id);
    const finalStageEvent = sorted.find((event) => event.stageId === lastStage.id);

    if (firstStageEvent && finalStageEvent) {
      const firstAt = parseDate(firstStageEvent.occurredAt);
      const finalAt = parseDate(finalStageEvent.occurredAt);
      if (firstAt !== null && finalAt !== null && finalAt >= firstAt) {
        totalConversionTimeMs += finalAt - firstAt;
        conversionCount += 1;
      }
    }

    const dropOffStageId = (() => {
      for (const stage of orderedStages) {
        if (!stageSet.has(stage.id)) {
          return stage.id;
        }
      }
      return null;
    })();

    (['source', 'campaign', 'country'] as SignupFunnelSegmentType[]).forEach((segmentType) => {
      const keyValue =
        segmentType === 'source'
          ? firstEvent.source
          : segmentType === 'campaign'
          ? firstEvent.campaign
          : firstEvent.country;
      const key = (keyValue ?? UNKNOWN_LABEL) || UNKNOWN_LABEL;
      const entry = ensureBreakdownEntry(breakdownMaps[segmentType], key);
      entry.leads.add(leadId);
      if (!dropOffStageId) {
        entry.converted.add(leadId);
      } else {
        entry.dropOffCounts.set(dropOffStageId, (entry.dropOffCounts.get(dropOffStageId) ?? 0) + 1);
      }
    });
  });

  const firstStage = orderedStages[0];
  const lastStage = orderedStages[orderedStages.length - 1];
  const totalLeads = stageLeadSets.get(firstStage.id)?.size ?? 0;
  const convertedLeads = stageLeadSets.get(lastStage.id)?.size ?? 0;
  const overallConversionRate = formatRate(convertedLeads, totalLeads);
  const averageLeadTimeSeconds = conversionCount
    ? Math.round(totalConversionTimeMs / conversionCount / 1000)
    : null;

  const stageMetrics: SignupFunnelStageMetrics[] = orderedStages.map((stage, index) => {
    const currentCount = stageLeadSets.get(stage.id)?.size ?? 0;
    const nextStage = orderedStages[index + 1];
    const nextCount = nextStage ? stageLeadSets.get(nextStage.id)?.size ?? 0 : 0;
    const accumulator = stageDurations.get(stage.id);
    const averageDuration = accumulator && accumulator.count > 0
      ? Math.round(accumulator.totalMs / accumulator.count / 1000)
      : null;
    const conversionRate = nextStage ? formatRate(nextCount, currentCount) : 100;
    const dropOffCount = nextStage ? Math.max(currentCount - nextCount, 0) : 0;
    const dropOffRate = nextStage ? formatRate(dropOffCount, currentCount) : 0;
    const cumulativeConversion = formatRate(currentCount, totalLeads);

    return {
      stageId: stage.id,
      label: stage.label,
      position: index,
      uniqueLeads: currentCount,
      conversionRate,
      cumulativeConversion,
      dropOffRate,
      dropOffCount,
      averageLeadTimeSeconds: averageDuration,
    };
  });

  const breakdown: SignupFunnelBreakdownRow[] = [];
  (['source', 'campaign', 'country'] as SignupFunnelSegmentType[]).forEach((segmentType) => {
    breakdownMaps[segmentType].forEach((entry, key) => {
      const total = entry.leads.size;
      const conversionRate = formatRate(entry.converted.size, total);
      let dropOffStageId: string | null = null;
      let maxDropOff = 0;
      entry.dropOffCounts.forEach((count, stageId) => {
        if (count > maxDropOff) {
          dropOffStageId = stageId;
          maxDropOff = count;
        }
      });
      breakdown.push({
        key,
        type: segmentType,
        totalLeads: total,
        conversionRate,
        dropOffStageId,
      });
    });
  });

  breakdown.sort((a, b) => b.conversionRate - a.conversionRate);

  return {
    stages: stageMetrics,
    totalLeads,
    overallConversionRate,
    averageLeadTimeSeconds,
    breakdown,
  };
}
