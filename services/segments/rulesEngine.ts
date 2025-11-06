import {
  Contact,
  SegmentDefinition,
  SegmentRule,
  SegmentRuleCondition,
  SegmentRuleContext,
} from '../../types';

export interface SegmentEvaluationOptions {
  context?: SegmentRuleContext;
}

export interface BatchEvaluationOptions {
  contextMap?: Map<string, SegmentRuleContext | undefined> | Record<string, SegmentRuleContext | undefined>;
}

const toLower = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }
  return String(value).toLowerCase();
};

const toNumber = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
};

const getFieldValue = (
  contact: Contact,
  field: SegmentRuleCondition['field'],
  context?: SegmentRuleContext,
): unknown => {
  switch (field) {
    case 'sector':
      return contact.sector ?? null;
    case 'type':
      return contact.type ?? null;
    case 'country':
      return contact.country ?? null;
    case 'city':
      return contact.city ?? null;
    case 'role':
      return contact.role ?? null;
    case 'revenueContribution':
      return contact.revenueContribution ?? context?.metrics?.revenueContribution ?? null;
    case 'touchFrequency':
      return contact.touchFrequency ?? null;
    case 'manualSegment':
      return contact.segmentIds ?? context?.manualSegments ?? [];
    case 'tags':
      return context?.tags ?? [];
    default:
      return null;
  }
};

export const evaluateCondition = (
  contact: Contact,
  condition: SegmentRuleCondition,
  context?: SegmentRuleContext,
): boolean => {
  const value = getFieldValue(contact, condition.field, context);
  const operator = condition.operator;
  const comparator = condition.value;

  switch (operator) {
    case 'equals': {
      if (typeof comparator === 'string') {
        const left = toLower(value);
        return left !== null && left === comparator.toLowerCase();
      }
      if (typeof comparator === 'number') {
        const numeric = toNumber(value);
        return numeric !== null && numeric === comparator;
      }
      if (Array.isArray(value)) {
        return value.includes(comparator as never);
      }
      return false;
    }
    case 'notEquals':
      return !evaluateCondition(contact, { ...condition, operator: 'equals' }, context);
    case 'in': {
      const values = ensureArray(comparator);
      if (Array.isArray(value)) {
        return value.some((item) => values.map((v) => toLower(v)).includes(toLower(item)));
      }
      const normalized = toLower(value);
      if (normalized === null) {
        return false;
      }
      return values.map((v) => toLower(v)).includes(normalized);
    }
    case 'notIn':
      return !evaluateCondition(contact, { ...condition, operator: 'in' }, context);
    case 'gte': {
      const numeric = toNumber(value);
      const comparatorValue = toNumber(comparator);
      return numeric !== null && comparatorValue !== null && numeric >= comparatorValue;
    }
    case 'gt': {
      const numeric = toNumber(value);
      const comparatorValue = toNumber(comparator);
      return numeric !== null && comparatorValue !== null && numeric > comparatorValue;
    }
    case 'lte': {
      const numeric = toNumber(value);
      const comparatorValue = toNumber(comparator);
      return numeric !== null && comparatorValue !== null && numeric <= comparatorValue;
    }
    case 'lt': {
      const numeric = toNumber(value);
      const comparatorValue = toNumber(comparator);
      return numeric !== null && comparatorValue !== null && numeric < comparatorValue;
    }
    case 'contains': {
      const needle = typeof comparator === 'string' ? comparator.toLowerCase() : String(comparator ?? '').toLowerCase();
      if (Array.isArray(value)) {
        return value.some((item) => toLower(item)?.includes(needle));
      }
      const haystack = toLower(value);
      return haystack !== null && haystack.includes(needle);
    }
    case 'between': {
      if (typeof comparator !== 'object' || comparator == null) {
        return false;
      }
      const numeric = toNumber(value);
      if (numeric === null) {
        return false;
      }
      const min = 'min' in comparator ? toNumber((comparator as { min?: number }).min) : null;
      const max = 'max' in comparator ? toNumber((comparator as { max?: number }).max) : null;
      if (min !== null && numeric < min) {
        return false;
      }
      if (max !== null && numeric > max) {
        return false;
      }
      return true;
    }
    default:
      return false;
  }
};

export const evaluateRule = (
  contact: Contact,
  rule: SegmentRule,
  context?: SegmentRuleContext,
): boolean => {
  if (!rule || !rule.conditions || rule.conditions.length === 0) {
    return true;
  }
  const matcher = rule.matcher ?? 'all';
  if (matcher === 'any') {
    return rule.conditions.some((condition) => evaluateCondition(contact, condition, context));
  }
  return rule.conditions.every((condition) => evaluateCondition(contact, condition, context));
};

export const evaluateSegmentsForContact = (
  contact: Contact,
  segments: SegmentDefinition[],
  options: SegmentEvaluationOptions = {},
): string[] => {
  const { context } = options;
  return segments
    .filter((segment) => !segment.manualOnly)
    .filter((segment) => {
      if (!segment.rules || segment.rules.length === 0) {
        return true;
      }
      return segment.rules.some((rule) => evaluateRule(contact, rule, context));
    })
    .map((segment) => segment.id);
};

export const autoAssignSegments = (
  contacts: Contact[],
  segments: SegmentDefinition[],
  options: BatchEvaluationOptions = {},
): Contact[] => {
  const { contextMap } = options;
  const getContextForContact = (contactId: string): SegmentRuleContext | undefined => {
    if (!contextMap) {
      return undefined;
    }
    if (contextMap instanceof Map) {
      return contextMap.get(contactId);
    }
    return contextMap[contactId];
  };

  return contacts.map((contact) => {
    const context = getContextForContact(contact.id);
    const autoSegments = evaluateSegmentsForContact(contact, segments, { context });
    const manualSegments = contact.segmentIds ?? [];
    const merged = Array.from(new Set([...manualSegments, ...autoSegments]));

    return {
      ...contact,
      segmentIds: merged,
      autoSegmentIds: autoSegments,
    };
  });
};

export default {
  evaluateCondition,
  evaluateRule,
  evaluateSegmentsForContact,
  autoAssignSegments,
};
