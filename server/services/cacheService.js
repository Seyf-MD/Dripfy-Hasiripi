import IORedis from 'ioredis';

const DEFAULT_TTL_SECONDS = Number(process.env.FORECAST_CACHE_TTL || 60 * 60 * 6);

let redisClientPromise = null;
let redisClient = null;

const fallbackStore = new Map();

function createRedisClient() {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    return null;
  }

  if (!redisClientPromise) {
    const options = process.env.REDIS_URL
      ? process.env.REDIS_URL
      : {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
        };

    const client = new IORedis(options);

    redisClientPromise = new Promise((resolve, reject) => {
      client.once('ready', () => {
        redisClient = client;
        resolve(client);
      });
      client.once('error', (error) => {
        console.warn('[cache] Redis connection error:', error.message);
        reject(error);
      });
    }).catch((error) => {
      if (client && typeof client.quit === 'function') {
        client.quit().catch(() => {});
      }
      redisClientPromise = null;
      redisClient = null;
      return null;
    });
  }

  return redisClientPromise;
}

function cleanupFallbackStore() {
  const now = Date.now();
  for (const [key, entry] of fallbackStore.entries()) {
    if (entry.expiresAt <= now) {
      fallbackStore.delete(key);
    }
  }
}

export async function setCacheValue(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!key) return false;

  const client = await createRedisClient();
  const payload = JSON.stringify(value);

  if (client) {
    try {
      await client.set(key, payload, 'EX', ttlSeconds);
      return true;
    } catch (error) {
      console.warn('[cache] Failed to store value in Redis, falling back to memory:', error.message);
    }
  }

  cleanupFallbackStore();
  fallbackStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return true;
}

export async function getCacheValue(key) {
  if (!key) return null;

  const client = await createRedisClient();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (error) {
      console.warn('[cache] Failed to read value from Redis, falling back to memory:', error.message);
    }
  }

  cleanupFallbackStore();
  const entry = fallbackStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    fallbackStore.delete(key);
    return null;
  }

  return entry.value;
}

export async function deleteCacheValue(key) {
  if (!key) return false;

  const client = await createRedisClient();
  if (client) {
    try {
      await client.del(key);
    } catch (error) {
      console.warn('[cache] Failed to delete Redis key:', error.message);
    }
  }

  fallbackStore.delete(key);
  return true;
}

export function getCacheDiagnostics() {
  cleanupFallbackStore();
  return {
    hasRedis: Boolean(redisClient),
    fallbackSize: fallbackStore.size,
    defaultTtlSeconds: DEFAULT_TTL_SECONDS,
  };
}
