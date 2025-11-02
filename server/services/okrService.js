import { randomUUID } from 'crypto';
import { readCollection, writeCollection } from './storageService.js';
import { recordAuditLog } from './logService.js';

const COLLECTION = 'okrs';

function normaliseTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => Boolean(tag.length));
}

function clampProgress(progress) {
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

function calculateKeyResultProgress(keyResults = []) {
  if (!Array.isArray(keyResults) || keyResults.length === 0) {
    return 0;
  }

  const completed = keyResults.reduce((sum, result) => {
    if (!result || typeof result !== 'object') {
      return sum;
    }
    const baseline = Number.isFinite(result.baseline) ? Number(result.baseline) : 0;
    const target = Number.isFinite(result.target) ? Number(result.target) : baseline + 1;
    const current = Number.isFinite(result.current) ? Number(result.current) : baseline;
    const denominator = Math.max(target - baseline, 1);
    const raw = (current - baseline) / denominator;
    const progress = Math.min(Math.max(raw, 0), 1);
    return sum + progress;
  }, 0);

  return Number((completed / keyResults.length).toFixed(2));
}

function validateOkrPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['Payload is required.'] };
  }

  if (!payload.objective || typeof payload.objective !== 'string') {
    errors.push('Objective is required.');
  }

  if (!payload.ownerRole || typeof payload.ownerRole !== 'string') {
    errors.push('Owner role is required.');
  }

  if (!payload.department || typeof payload.department !== 'string') {
    errors.push('Department is required.');
  }

  if (payload.progress !== undefined && (typeof payload.progress !== 'number' || payload.progress < 0 || payload.progress > 1)) {
    errors.push('Progress must be a number between 0 and 1.');
  }

  if (payload.keyResults) {
    payload.keyResults.forEach((result, index) => {
      if (!result || typeof result !== 'object') {
        errors.push(`Key result #${index + 1} is invalid.`);
        return;
      }
      if (!result.title) {
        errors.push(`Key result #${index + 1} must include a title.`);
      }
      if (typeof result.target !== 'number') {
        errors.push(`Key result #${index + 1} must include a numeric target.`);
      }
      if (typeof result.current !== 'number') {
        errors.push(`Key result #${index + 1} must include a numeric current value.`);
      }
    });
  }

  if (payload.metrics) {
    const { baseline, target, current } = payload.metrics;
    if ([baseline, target, current].some((value) => value !== undefined && typeof value !== 'number')) {
      errors.push('Metric values must be numeric.');
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      ...payload,
      progress: payload.progress !== undefined ? clampProgress(payload.progress) : payload.progress,
      tags: normaliseTags(payload.tags),
    },
  };
}

export async function listOkrs({ role, department } = {}) {
  const okrs = await readCollection(COLLECTION);
  if (!Array.isArray(okrs)) {
    throw new Error('OKR collection is not a list.');
  }

  return okrs.filter((okr) => {
    if (role && okr.ownerRole && okr.ownerRole !== role) {
      return false;
    }
    if (department && okr.department && okr.department !== department) {
      return false;
    }
    return true;
  });
}

export async function getOkrById(id) {
  const okrs = await readCollection(COLLECTION);
  if (!Array.isArray(okrs)) {
    throw new Error('OKR collection is not a list.');
  }
  return okrs.find((okr) => okr.id === id) || null;
}

export async function upsertOkr(payload, { actor } = {}) {
  const validation = validateOkrPayload(payload);
  if (!validation.ok) {
    const error = new Error(validation.errors.join(' '));
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const okrs = await readCollection(COLLECTION);
  if (!Array.isArray(okrs)) {
    throw new Error('OKR collection is not a list.');
  }

  const now = new Date().toISOString();
  const data = validation.data;
  const keyResults = Array.isArray(data.keyResults) ? data.keyResults : [];
  const derivedProgress = keyResults.length > 0 ? calculateKeyResultProgress(keyResults) : undefined;

  let record;
  const index = data.id ? okrs.findIndex((okr) => okr.id === data.id) : -1;

  if (index >= 0) {
    const current = okrs[index];
    record = {
      ...current,
      ...data,
      progress: data.progress !== undefined ? data.progress : (derivedProgress !== undefined ? derivedProgress : current.progress || 0),
      keyResults: keyResults.length > 0 ? keyResults : current.keyResults || [],
      metrics: {
        ...current.metrics,
        ...(data.metrics || {}),
      },
      lastUpdatedAt: now,
      lastUpdatedBy: actor?.email || actor?.name || 'system',
    };
    okrs[index] = record;
  } else {
    record = {
      id: data.id || `okr-${randomUUID()}`,
      objective: data.objective,
      ownerRole: data.ownerRole,
      department: data.department,
      startDate: data.startDate || now,
      targetDate: data.targetDate || now,
      status: data.status || 'active',
      tags: normaliseTags(data.tags),
      keyResults,
      metrics: {
        baseline: data.metrics?.baseline ?? 0,
        target: data.metrics?.target ?? 100,
        current: data.metrics?.current ?? 0,
        unit: data.metrics?.unit || 'percent',
      },
      progress: data.progress !== undefined ? data.progress : (derivedProgress !== undefined ? derivedProgress : 0),
      lastUpdatedAt: now,
      lastUpdatedBy: actor?.email || actor?.name || 'system',
      reviewerRole: data.reviewerRole || null,
      requiresValidation: data.requiresValidation ?? false,
      validatedAt: null,
      validatedBy: null,
    };
    okrs.push(record);
  }

  await writeCollection(COLLECTION, okrs);

  await recordAuditLog({
    user: actor?.email || actor?.name || 'system',
    action: index >= 0 ? 'Updated' : 'Created',
    targetType: 'OKR',
    targetId: record.id,
    details: `${record.objective} (${Math.round(record.progress * 100)}%)`,
  });

  return record;
}

export async function validateOkr(id, { validatedBy, notes } = {}) {
  if (!id) {
    throw new Error('OKR id is required for validation.');
  }

  const okrs = await readCollection(COLLECTION);
  if (!Array.isArray(okrs)) {
    throw new Error('OKR collection is not a list.');
  }

  const index = okrs.findIndex((okr) => okr.id === id);
  if (index === -1) {
    const error = new Error('OKR not found.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const now = new Date().toISOString();
  const updated = {
    ...okrs[index],
    requiresValidation: false,
    validatedAt: now,
    validatedBy: validatedBy || 'system',
    lastUpdatedAt: now,
    lastUpdatedBy: validatedBy || 'system',
  };

  okrs[index] = updated;
  await writeCollection(COLLECTION, okrs);

  await recordAuditLog({
    user: validatedBy || 'system',
    action: 'Approved',
    targetType: 'OKR',
    targetId: id,
    details: notes || `OKR ${id} validated`,
  });

  return updated;
}
