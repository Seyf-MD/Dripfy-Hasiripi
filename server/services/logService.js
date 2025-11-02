import { randomUUID } from 'crypto';
import { readCollection, writeCollection } from './storageService.js';

const LOGIN_COLLECTION = 'loginLogs';
const ERROR_COLLECTION = 'errorLogs';
const AUDIT_COLLECTION = 'auditLog';

const DEFAULT_AUDIT_LABEL = 'general';
const DEFAULT_AUDIT_SOURCE_MODULE = 'unknown';
const DEFAULT_AUDIT_CRITICALITY = 'medium';
const CRITICALITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const MAX_PAGE_SIZE = 200;

function toIndexKey(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normaliseCriticality(value) {
  const key = toIndexKey(value);
  if (!key) {
    return DEFAULT_AUDIT_CRITICALITY;
  }
  if (CRITICALITY_LEVELS.includes(key)) {
    return key;
  }
  return DEFAULT_AUDIT_CRITICALITY;
}

function normaliseAuditEntry(entry) {
  return {
    ...entry,
    label: typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : DEFAULT_AUDIT_LABEL,
    sourceModule:
      typeof entry.sourceModule === 'string' && entry.sourceModule.trim()
        ? entry.sourceModule.trim()
        : DEFAULT_AUDIT_SOURCE_MODULE,
    criticality: normaliseCriticality(entry.criticality),
    timestamp: new Date(entry.timestamp || Date.now()).toISOString(),
  };
}

function createEmptyCache(loaded = false) {
  return {
    loaded,
    entries: [],
    byId: new Map(),
    indexes: {
      user: new Map(),
      action: new Map(),
      label: new Map(),
      sourceModule: new Map(),
      criticality: new Map(),
    },
    options: {
      users: [],
      actions: [],
      labels: [],
      sourceModules: [],
      criticalities: [...CRITICALITY_LEVELS],
    },
  };
}

let auditCache = createEmptyCache(false);

async function appendToCollection(collection, entry) {
  const list = await readCollection(collection);
  if (!Array.isArray(list)) {
    throw new Error(`Collection ${collection} is not an array`);
  }
  list.push(entry);
  await writeCollection(collection, list);
  return entry;
}

function addToIndex(indexMap, id, rawValue) {
  const key = toIndexKey(rawValue);
  if (!key) {
    return;
  }
  const existing = indexMap.get(key);
  if (existing) {
    existing.ids.add(id);
    if (!existing.values.has(rawValue)) {
      existing.values.add(rawValue);
    }
    return;
  }
  indexMap.set(key, { ids: new Set([id]), values: new Set([rawValue]) });
}

function rebuildOptionsFromIndexes(indexes) {
  const mapValuesToSortedArray = (indexMap, sorter) => {
    const values = [];
    for (const entry of indexMap.values()) {
      for (const value of entry.values) {
        values.push(value);
      }
    }
    const unique = Array.from(new Set(values));
    return sorter ? unique.sort(sorter) : unique.sort((a, b) => a.localeCompare(b));
  };

  const criticalitySorter = (a, b) => {
    const idxA = CRITICALITY_LEVELS.indexOf(a.toLowerCase());
    const idxB = CRITICALITY_LEVELS.indexOf(b.toLowerCase());
    const safeA = idxA === -1 ? Number.MAX_SAFE_INTEGER : idxA;
    const safeB = idxB === -1 ? Number.MAX_SAFE_INTEGER : idxB;
    return safeA - safeB;
  };

  return {
    users: mapValuesToSortedArray(indexes.user),
    actions: mapValuesToSortedArray(indexes.action),
    labels: mapValuesToSortedArray(indexes.label),
    sourceModules: mapValuesToSortedArray(indexes.sourceModule),
    criticalities: mapValuesToSortedArray(indexes.criticality, criticalitySorter),
  };
}

function buildAuditCache(entries) {
  const cache = createEmptyCache(true);
  cache.entries = entries
    .map(normaliseAuditEntry)
    .sort((a, b) => {
      const tsDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (tsDiff !== 0) {
        return tsDiff;
      }
      return b.id.localeCompare(a.id);
    });

  for (const entry of cache.entries) {
    cache.byId.set(entry.id, entry);
    addToIndex(cache.indexes.user, entry.id, entry.user);
    addToIndex(cache.indexes.action, entry.id, entry.action);
    addToIndex(cache.indexes.label, entry.id, entry.label);
    addToIndex(cache.indexes.sourceModule, entry.id, entry.sourceModule);
    addToIndex(cache.indexes.criticality, entry.id, entry.criticality);
  }

  cache.options = rebuildOptionsFromIndexes(cache.indexes);
  return cache;
}

async function loadAuditCache(force = false) {
  if (!auditCache.loaded || force) {
    const entries = await readCollection(AUDIT_COLLECTION);
    if (!Array.isArray(entries)) {
      auditCache = createEmptyCache();
      return auditCache;
    }
    auditCache = buildAuditCache(entries);
  }
  return auditCache;
}

function insertIntoAuditCache(entry) {
  if (!auditCache.loaded) {
    return;
  }

  const normalised = normaliseAuditEntry(entry);
  const timestamp = new Date(normalised.timestamp).getTime();

  let index = 0;
  while (index < auditCache.entries.length) {
    const current = auditCache.entries[index];
    const currentTime = new Date(current.timestamp).getTime();
    if (timestamp > currentTime) {
      break;
    }
    if (timestamp === currentTime && normalised.id.localeCompare(current.id) > 0) {
      break;
    }
    index += 1;
  }

  auditCache.entries.splice(index, 0, normalised);
  auditCache.byId.set(normalised.id, normalised);
  addToIndex(auditCache.indexes.user, normalised.id, normalised.user);
  addToIndex(auditCache.indexes.action, normalised.id, normalised.action);
  addToIndex(auditCache.indexes.label, normalised.id, normalised.label);
  addToIndex(auditCache.indexes.sourceModule, normalised.id, normalised.sourceModule);
  addToIndex(auditCache.indexes.criticality, normalised.id, normalised.criticality);
  auditCache.options = rebuildOptionsFromIndexes(auditCache.indexes);
}

function intersectIdSets(sets) {
  if (!sets.length) {
    return null;
  }
  sets.sort((a, b) => a.size - b.size);
  const [smallest, ...rest] = sets;
  const result = new Set();
  for (const id of smallest) {
    if (rest.every(set => set.has(id))) {
      result.add(id);
    }
  }
  return result;
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestamp, id] = decoded.split('::');
    if (timestamp && id) {
      return { timestamp, id };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function encodeCursor(entry) {
  const payload = `${entry.timestamp}::${entry.id}`;
  return Buffer.from(payload, 'utf-8').toString('base64');
}

function resolveCandidateSets(cache, filters) {
  const sets = [];
  const { user, action, label, sourceModule, criticality } = filters;

  if (user) {
    const match = cache.indexes.user.get(toIndexKey(user));
    if (match) {
      sets.push(match.ids);
    } else {
      return new Set();
    }
  }
  if (action) {
    const match = cache.indexes.action.get(toIndexKey(action));
    if (match) {
      sets.push(match.ids);
    } else {
      return new Set();
    }
  }
  if (label) {
    const match = cache.indexes.label.get(toIndexKey(label));
    if (match) {
      sets.push(match.ids);
    } else {
      return new Set();
    }
  }
  if (sourceModule) {
    const match = cache.indexes.sourceModule.get(toIndexKey(sourceModule));
    if (match) {
      sets.push(match.ids);
    } else {
      return new Set();
    }
  }
  if (criticality) {
    const match = cache.indexes.criticality.get(toIndexKey(criticality));
    if (match) {
      sets.push(match.ids);
    } else {
      return new Set();
    }
  }

  return intersectIdSets(sets);
}

export async function recordLoginEvent({ userId, email, ip, userAgent, timestamp = new Date().toISOString() }) {
  const entry = {
    id: randomUUID(),
    userId,
    email,
    ip,
    userAgent,
    timestamp: new Date(timestamp).toISOString(),
  };
  await appendToCollection(LOGIN_COLLECTION, entry);
  return entry;
}

export async function recordErrorLog({ message, stack, context, timestamp = new Date().toISOString() }) {
  const entry = {
    id: randomUUID(),
    message,
    stack,
    context,
    timestamp: new Date(timestamp).toISOString(),
  };
  await appendToCollection(ERROR_COLLECTION, entry);
  return entry;
}

export async function recordAuditLog({
  user,
  action,
  targetType,
  targetId,
  details,
  label = DEFAULT_AUDIT_LABEL,
  sourceModule = DEFAULT_AUDIT_SOURCE_MODULE,
  criticality = DEFAULT_AUDIT_CRITICALITY,
  timestamp = new Date().toISOString(),
}) {
  const entry = normaliseAuditEntry({
    id: randomUUID(),
    user,
    action,
    targetType,
    targetId,
    details,
    label,
    sourceModule,
    criticality,
    timestamp,
  });

  await appendToCollection(AUDIT_COLLECTION, entry);
  insertIntoAuditCache(entry);
  return entry;
}

export async function searchAuditLogs({
  startDate,
  endDate,
  user,
  action,
  label,
  sourceModule,
  criticality,
  cursor,
  limit = 50,
} = {}) {
  const cache = await loadAuditCache();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, MAX_PAGE_SIZE));
  const candidateIdSet = resolveCandidateSets(cache, { user, action, label, sourceModule, criticality });

  let filtered = cache.entries;
  if (candidateIdSet instanceof Set) {
    if (candidateIdSet.size === 0 && (user || action || label || sourceModule || criticality)) {
      return { results: [], total: 0, nextCursor: null, hasMore: false };
    }
    if (candidateIdSet.size > 0) {
      filtered = filtered.filter(entry => candidateIdSet.has(entry.id));
    }
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && !Number.isNaN(start.getTime())) {
    filtered = filtered.filter(entry => new Date(entry.timestamp) >= start);
  }
  if (end && !Number.isNaN(end.getTime())) {
    filtered = filtered.filter(entry => new Date(entry.timestamp) <= end);
  }

  const totalMatches = filtered.length;

  const cursorPayload = decodeCursor(cursor);
  if (cursorPayload) {
    const cursorIndex = filtered.findIndex(
      entry => entry.id === cursorPayload.id && entry.timestamp === cursorPayload.timestamp,
    );
    if (cursorIndex >= 0) {
      filtered = filtered.slice(cursorIndex + 1);
    }
  }

  const page = filtered.slice(0, safeLimit);
  const lastEntry = page[page.length - 1];
  const hasMore = filtered.length > safeLimit;
  const nextCursor = hasMore && lastEntry ? encodeCursor(lastEntry) : null;

  return {
    results: page,
    total: totalMatches,
    nextCursor,
    hasMore,
  };
}

export async function getAuditFilterOptions() {
  const cache = await loadAuditCache();
  return cache.options;
}
