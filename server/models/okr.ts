export type KeyResultStatus = 'onTrack' | 'atRisk' | 'offTrack' | 'completed';

export interface KeyResult {
  id: string;
  title: string;
  metricUnit: string;
  baseline: number;
  target: number;
  current: number;
  status: KeyResultStatus;
}

export type OKRStatus = 'draft' | 'active' | 'completed' | 'onHold';

export interface OKRMetrics {
  baseline: number;
  target: number;
  current: number;
  unit: string;
}

export interface OKRRecord {
  id: string;
  objective: string;
  ownerRole: string;
  department: string;
  startDate: string;
  targetDate: string;
  progress: number;
  status: OKRStatus;
  tags: string[];
  keyResults: KeyResult[];
  metrics: OKRMetrics;
  lastUpdatedAt: string;
  lastUpdatedBy?: string;
  reviewerRole?: string;
  requiresValidation: boolean;
  validatedAt?: string | null;
  validatedBy?: string | null;
}

export interface OKRUpdatePayload {
  id?: string;
  objective: string;
  ownerRole: string;
  department: string;
  startDate?: string;
  targetDate?: string;
  progress?: number;
  status?: OKRStatus;
  tags?: string[];
  keyResults?: KeyResult[];
  metrics?: Partial<OKRMetrics>;
  requiresValidation?: boolean;
}

export interface OKRValidationPayload {
  id: string;
  validatedBy: string;
  validationNotes?: string;
}

export const SUPPORTED_DEPARTMENTS = [
  'Operations',
  'Expansion',
  'Revenue',
  'Medical',
  'Product',
  'People'
] as const;

export const SUPPORTED_ROLES = [
  'admin',
  'finance',
  'operations',
  'product',
  'medical',
  'people'
] as const;

export function calculateProgressFromKeyResults(keyResults: KeyResult[]): number {
  if (!Array.isArray(keyResults) || keyResults.length === 0) {
    return 0;
  }

  const totalWeight = keyResults.length;
  const completed = keyResults.reduce((sum, kr) => {
    const denominator = Math.max(kr.target - kr.baseline, 1);
    const raw = (kr.current - kr.baseline) / denominator;
    const progress = Math.min(Math.max(raw, 0), 1);
    return sum + progress;
  }, 0);

  return Number((completed / totalWeight).toFixed(2));
}

export function normaliseProgress(progress: number | undefined): number {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return 0;
  }
  if (!Number.isFinite(progress)) {
    return 0;
  }
  if (progress < 0) {
    return 0;
  }
  if (progress > 1) {
    return 1;
  }
  return Number(progress.toFixed(2));
}

export function sanitiseTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => Boolean(tag.length));
}

export function isSupportedDepartment(value: string): boolean {
  return (SUPPORTED_DEPARTMENTS as readonly string[]).includes(value);
}

export function isSupportedRole(value: string): boolean {
  return (SUPPORTED_ROLES as readonly string[]).includes(value);
}

export function isSupportedKeyResultStatus(status: string): status is KeyResultStatus {
  return (['onTrack', 'atRisk', 'offTrack', 'completed'] as const).includes(status as KeyResultStatus);
}

export function validateOKRPayload(payload: OKRUpdatePayload): { ok: true; data: OKRUpdatePayload } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!payload.objective || typeof payload.objective !== 'string') {
    errors.push('Objective is required.');
  }

  if (!payload.ownerRole || typeof payload.ownerRole !== 'string') {
    errors.push('Owner role is required.');
  } else if (!isSupportedRole(payload.ownerRole)) {
    errors.push('Owner role is not supported.');
  }

  if (!payload.department || typeof payload.department !== 'string') {
    errors.push('Department is required.');
  } else if (!isSupportedDepartment(payload.department)) {
    errors.push('Department is not supported.');
  }

  if (payload.progress !== undefined && (typeof payload.progress !== 'number' || payload.progress < 0 || payload.progress > 1)) {
    errors.push('Progress must be a number between 0 and 1.');
  }

  if (payload.metrics) {
    const { baseline, target, current } = payload.metrics;
    if ([baseline, target, current].some((value) => value !== undefined && typeof value !== 'number')) {
      errors.push('Metric values must be numbers.');
    }
  }

  if (payload.keyResults) {
    payload.keyResults.forEach((kr, index) => {
      if (!kr.title) {
        errors.push(`Key result #${index + 1} must include a title.`);
      }
      if (typeof kr.target !== 'number') {
        errors.push(`Key result #${index + 1} must include a numeric target.`);
      }
      if (typeof kr.current !== 'number') {
        errors.push(`Key result #${index + 1} must include a numeric current value.`);
      }
      if (!isSupportedKeyResultStatus(kr.status)) {
        errors.push(`Key result #${index + 1} has an invalid status.`);
      }
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      ...payload,
      progress: payload.progress !== undefined ? normaliseProgress(payload.progress) : payload.progress,
      tags: sanitiseTags(payload.tags),
    },
  };
}
