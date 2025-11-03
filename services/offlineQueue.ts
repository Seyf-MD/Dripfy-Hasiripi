export interface OfflineQueueEntryMeta {
  formId?: string;
  feature?: string;
  description?: string;
}

export interface OfflineQueueEntry {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  meta?: OfflineQueueEntryMeta;
  attempts: number;
  lastError?: string;
  timestamp: number;
}

export interface OfflineQueueState {
  entries: OfflineQueueEntry[];
  queueLength: number;
  lastSyncedAt: number | null;
  processing: boolean;
}

export interface EnqueueFormSubmissionOptions {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  meta?: OfflineQueueEntryMeta;
}

const STORAGE_KEY = 'dripfy-offline-queue';

let queue: OfflineQueueEntry[] = [];
let processing = false;
let lastSyncedAt: number | null = null;
const listeners = new Set<(state: OfflineQueueState) => void>();

class OfflineQueueStorage {
  private storage: Storage | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      this.storage = window.localStorage;
      const testKey = '__offline_queue_test__';
      this.storage.setItem(testKey, '1');
      this.storage.removeItem(testKey);
    } catch (error) {
      console.warn('[offlineQueue] Local storage unavailable', error);
      this.storage = null;
    }
  }

  read(): OfflineQueueEntry[] {
    if (!this.storage) {
      return [];
    }
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as OfflineQueueEntry[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map((entry) => ({ ...entry, attempts: entry.attempts ?? 0 }));
    } catch (error) {
      console.warn('[offlineQueue] Failed to read persisted queue', error);
      return [];
    }
  }

  write(entries: OfflineQueueEntry[]): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('[offlineQueue] Failed to persist queue', error);
    }
  }
}

const storage = new OfflineQueueStorage();
queue = storage.read();

export class OfflineQueueError extends Error {
  constructor(message: string, public readonly entry: OfflineQueueEntry) {
    super(message);
    this.name = 'OfflineQueueError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function getState(): OfflineQueueState {
  return {
    entries: [...queue],
    queueLength: queue.length,
    lastSyncedAt,
    processing,
  };
}

function notify(): void {
  const state = getState();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error('[offlineQueue] Listener failed', error);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offlinequeue:updated', { detail: state }));
  }
  storage.write(queue);
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normaliseBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body instanceof Blob || body instanceof FormData) {
    return body;
  }
  return JSON.stringify(body);
}

async function requestBackgroundSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await registration.sync.register('offline-queue-sync');
    } else if (registration.active) {
      registration.active.postMessage('OFFLINE_QUEUE_SYNC');
    }
  } catch (error) {
    console.warn('[offlineQueue] Background sync registration failed', error);
  }
}

export function getQueueState(): OfflineQueueState {
  return getState();
}

export function subscribe(listener: (state: OfflineQueueState) => void): () => void {
  listeners.add(listener);
  listener(getState());
  return () => {
    listeners.delete(listener);
  };
}

export async function enqueueFormSubmission(options: EnqueueFormSubmissionOptions): Promise<OfflineQueueEntry> {
  const entry: OfflineQueueEntry = {
    id: makeId(),
    url: options.url,
    method: options.method,
    body: options.body,
    headers: options.headers,
    credentials: options.credentials,
    meta: options.meta,
    attempts: 0,
    timestamp: Date.now(),
  };
  queue.push(entry);
  notify();
  await requestBackgroundSync();
  return entry;
}

export async function processQueue(): Promise<{ processed: number; remaining: number }> {
  if (processing) {
    return { processed: 0, remaining: queue.length };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, remaining: queue.length };
  }
  processing = true;
  notify();
  let processed = 0;
  const entries = [...queue];

  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: entry.headers,
        credentials: entry.credentials,
        body: normaliseBody(entry.body),
      });
      if (!response.ok) {
        throw new Error(`Sunucu ${response.status} yanıtı verdi`);
      }
      queue = queue.filter((item) => item.id !== entry.id);
      processed += 1;
      lastSyncedAt = Date.now();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offlinequeue:entry-processed', { detail: entry }));
      }
      notify();
    } catch (error) {
      const index = queue.findIndex((item) => item.id === entry.id);
      if (index !== -1) {
        queue[index] = {
          ...queue[index],
          attempts: queue[index].attempts + 1,
          lastError: error instanceof Error ? error.message : String(error),
        };
      }
      notify();
    }
  }

  processing = false;
  notify();
  return { processed, remaining: queue.length };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processQueue().catch((error) => console.error('[offlineQueue] Queue process failed after reconnect', error));
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'OFFLINE_QUEUE_FLUSH_REQUEST') {
        processQueue().catch((error) => console.error('[offlineQueue] Sync trigger failed', error));
      }
    });
  }
}
