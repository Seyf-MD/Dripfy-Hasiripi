import type { InsightPersonalizationContext, InsightRecord, InsightSeverity } from '../../types';
import { isRoleAtLeast } from '../../types';

const SEVERITY_ORDER: InsightSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

function severityRank(severity: InsightSeverity): number {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index >= 0 ? SEVERITY_ORDER.length - index : 0;
}

function matchesRoleRequirement(insight: InsightRecord, context: InsightPersonalizationContext): boolean {
  if (!insight.audience) {
    return true;
  }

  const { minRole, roles, operationalRoles, departments, tags } = insight.audience;

  if (minRole && !isRoleAtLeast(context.role, minRole)) {
    return false;
  }

  if (roles && roles.length > 0 && context.role && !roles.includes(context.role)) {
    return false;
  }

  if (operationalRoles && operationalRoles.length > 0) {
    if (!context.operationalRole || !operationalRoles.includes(context.operationalRole)) {
      return false;
    }
  }

  if (departments && departments.length > 0) {
    if (!context.department || !departments.includes(context.department)) {
      return false;
    }
  }

  if (tags && tags.length > 0 && context.tags && context.tags.length > 0) {
    const match = tags.some((tag) => (context.tags ? context.tags.includes(tag) : false));
    if (!match) {
      return false;
    }
  }

  return true;
}

function computeRelevance(insight: InsightRecord, context: InsightPersonalizationContext): number {
  const base = severityRank(insight.severity);
  const score = insight.score ? insight.score * 10 : 0;
  const confidence = insight.confidence * 5;
  const bonus = insight.tags?.some((tag) => (context.tags ? context.tags.includes(tag) : false)) ? 2 : 0;
  return base + score + confidence + bonus;
}

export function selectInsightsForAudience(
  insights: InsightRecord[],
  context: InsightPersonalizationContext,
  options: { limit?: number } = {},
): InsightRecord[] {
  const filtered = insights.filter((insight) => matchesRoleRequirement(insight, context));
  const ranked = filtered.sort((a, b) => computeRelevance(b, context) - computeRelevance(a, context));
  if (typeof options.limit === 'number') {
    return ranked.slice(0, options.limit);
  }
  return ranked;
}

export function groupInsightsByCategory(insights: InsightRecord[]): Record<string, InsightRecord[]> {
  return insights.reduce<Record<string, InsightRecord[]>>((acc, insight) => {
    const key = insight.category;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(insight);
    return acc;
  }, {});
}

export function getTopInsightsBySeverity(
  insights: InsightRecord[],
  severity: InsightSeverity,
  options: { limit?: number } = {},
): InsightRecord[] {
  const filtered = insights.filter((insight) => insight.severity === severity);
  const ranked = filtered.sort((a, b) => b.score - a.score);
  if (typeof options.limit === 'number') {
    return ranked.slice(0, options.limit);
  }
  return ranked;
}
