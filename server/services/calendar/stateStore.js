import { randomUUID } from 'node:crypto';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [state, entry] of store.entries()) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      store.delete(state);
    }
  }
}

export function createState(payload) {
  purgeExpired();
  const state = randomUUID();
  store.set(state, { ...payload, createdAt: Date.now() });
  return state;
}

export function consumeState(state) {
  purgeExpired();
  const entry = store.get(state);
  if (entry) {
    store.delete(state);
  }
  return entry || null;
}
