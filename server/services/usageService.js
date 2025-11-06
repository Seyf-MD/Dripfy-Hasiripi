import { chatbotConfig } from '../config/index.js';
import { readCollection, writeCollection } from './storageService.js';
import { anonymizeLogObject, generateUsageEventId, maskSensitiveText } from './privacyService.js';

const COLLECTION = 'usageMetrics';
const MAX_USAGE_RECORDS = 5000;

function ensureNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function estimateCost({ inputTokens = 0, outputTokens = 0 }) {
  const inputPrice = ensureNumber(chatbotConfig?.usage?.inputTokenPrice, 0);
  const outputPrice = ensureNumber(chatbotConfig?.usage?.outputTokenPrice, 0);

  const inputCost = (inputTokens / 1000) * inputPrice;
  const outputCost = (outputTokens / 1000) * outputPrice;

  return Number((inputCost + outputCost).toFixed(6));
}

async function readUsageCollection() {
  const usage = await readCollection(COLLECTION);
  return Array.isArray(usage) ? usage : [];
}

export async function recordUsageEvent({
  status = 'success',
  model,
  inputTokens = 0,
  outputTokens = 0,
  totalTokens = inputTokens + outputTokens,
  promptPreview,
  templateId,
  language,
  sources,
  errorCode,
}) {
  const events = await readUsageCollection();
  const normalizedSources = Array.isArray(sources) ? sources : [];
  const event = anonymizeLogObject({
    id: generateUsageEventId(),
    timestamp: new Date().toISOString(),
    status,
    model: model || chatbotConfig?.openAI?.model || 'unknown',
    inputTokens: ensureNumber(inputTokens),
    outputTokens: ensureNumber(outputTokens),
    totalTokens: ensureNumber(totalTokens),
    promptPreview: maskSensitiveText((promptPreview || '').slice(0, 160)),
    templateId: templateId || null,
    language: language || null,
    sources: normalizedSources.slice(0, 10),
    cost: estimateCost({ inputTokens, outputTokens }),
    errorCode: errorCode || null,
  });

  const nextEvents = [...events, event].slice(-MAX_USAGE_RECORDS);
  await writeCollection(COLLECTION, nextEvents);

  return event;
}

function isWithinWindow(timestamp, windowMs) {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= windowMs;
}

function isSameMonth(timestamp, referenceDate = new Date()) {
  const time = new Date(timestamp);
  return (
    time.getFullYear() === referenceDate.getFullYear() &&
    time.getMonth() === referenceDate.getMonth()
  );
}

function aggregateUsage(events) {
  return events.reduce(
    (acc, event) => {
      acc.inputTokens += ensureNumber(event.inputTokens);
      acc.outputTokens += ensureNumber(event.outputTokens);
      acc.totalTokens += ensureNumber(event.totalTokens);
      acc.cost = Number((acc.cost + ensureNumber(event.cost)).toFixed(6));
      return acc;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
  );
}

function getMonthlyResetDate(referenceDate = new Date()) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
}

export async function getUsageSummary({ windowDays = 30 } = {}) {
  const events = await readUsageCollection();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter((event) => isWithinWindow(event.timestamp, windowMs));
  const totals = aggregateUsage(recentEvents);

  const monthlyTotals = aggregateUsage(events.filter((event) => isSameMonth(event.timestamp)));
  const monthlyQuota = ensureNumber(chatbotConfig?.usage?.monthlyTokenQuota, 0);
  const currency = chatbotConfig?.usage?.currency || 'USD';
  const resetDate = monthlyQuota ? getMonthlyResetDate() : null;

  return {
    ok: true,
    totals,
    windowDays,
    currency,
    monthly: {
      usedTokens: monthlyTotals.totalTokens,
      quota: monthlyQuota || null,
      remainingTokens: monthlyQuota ? Math.max(monthlyQuota - monthlyTotals.totalTokens, 0) : null,
      estimatedCost: monthlyTotals.cost,
      resetAt: resetDate ? resetDate.toISOString() : null,
    },
    lastEventAt: events.length ? events[events.length - 1].timestamp : null,
  };
}

export async function listUsageEvents({ limit = 100 } = {}) {
  const events = await readUsageCollection();
  return events.slice(-limit).reverse();
}

export async function isQuotaExceeded() {
  const quota = ensureNumber(chatbotConfig?.usage?.monthlyTokenQuota, 0);
  if (!quota) {
    return false;
  }
  const events = await readUsageCollection();
  const monthlyTotals = aggregateUsage(events.filter((event) => isSameMonth(event.timestamp)));
  return monthlyTotals.totalTokens >= quota;
}
