import { randomUUID } from 'crypto';
import EventEmitter from 'events';
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { getDataset } from './datasetRegistry.js';
import { applyFieldMapping } from './mappingService.js';
import { validateMappedRows } from './validationService.js';
import {
  getUploadSession,
  updateUploadSession,
  deleteUploadSession,
  persistErrorReport,
  persistExportFile,
} from './uploadStore.js';
import { buildErrorReportCsv } from './fileParser.js';
import { readCollection, writeCollection } from '../storageService.js';
import { recordAuditLog } from '../logService.js';

const QUEUE_NAME = 'data-importer';
const CHUNK_SIZE = Number(process.env.IMPORT_CHUNK_SIZE || 250);

const jobSummaries = new Map();

function updateJobSummary(jobId, updates) {
  const previous = jobSummaries.get(jobId) || { status: 'queued', progress: 0 };
  const next = { ...previous, ...updates };
  jobSummaries.set(jobId, next);
  return next;
}

function mapRowForExport(dataset, row) {
  const mapped = {};
  for (const field of Object.keys(dataset.fields)) {
    mapped[field] = row?.[field] ?? '';
  }
  return mapped;
}

function toCsvLine(values) {
  return values
    .map((value) => {
      const text = value == null ? '' : String(value);
      if (text === '') {
        return '';
      }
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    })
    .join(',');
}

function buildDatasetCsv(dataset, rows) {
  const headers = Object.keys(dataset.fields);
  const lines = [toCsvLine(headers)];
  for (const row of rows) {
    const ordered = headers.map((field) => row[field]);
    lines.push(toCsvLine(ordered));
  }
  return lines.join('\n');
}

function filterRows(rows, filters = {}) {
  if (!filters || typeof filters !== 'object') {
    return rows;
  }
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) {
    return rows;
  }
  return rows.filter((row) =>
    entries.every(([field, value]) => {
      const current = row?.[field];
      if (Array.isArray(value)) {
        return value.includes(current);
      }
      if (value && typeof value === 'string') {
        return String(current ?? '').toLowerCase().includes(value.toLowerCase());
      }
      return current === value;
    }),
  );
}

async function applyRowsToCollection(dataset, rows) {
  const collection = await readCollection(dataset.collection);
  if (!Array.isArray(collection)) {
    throw new Error('Koleksiyon okunamadı');
  }

  const primaryKey = dataset.primaryKey;
  const buffer = [...collection];
  let updated = 0;
  let inserted = 0;

  const indexByKey = new Map();
  if (primaryKey) {
    buffer.forEach((item, idx) => {
      if (item && item[primaryKey]) {
        indexByKey.set(String(item[primaryKey]), idx);
      }
    });
  }

  for (const { data } of rows) {
    if (primaryKey && data[primaryKey]) {
      const key = String(data[primaryKey]);
      if (indexByKey.has(key)) {
        buffer[indexByKey.get(key)] = { ...buffer[indexByKey.get(key)], ...data };
        updated += 1;
        continue;
      }
      indexByKey.set(key, buffer.length);
    }
    buffer.push({ ...data, importedAt: new Date().toISOString() });
    inserted += 1;
  }

  await writeCollection(dataset.collection, buffer);
  return { inserted, updated };
}

async function ensureValidRows(session, datasetId, mapping) {
  if (Array.isArray(session.validRows) && session.validRows.length > 0) {
    return session.validRows;
  }
  const mappedRows = applyFieldMapping(session.rows || [], datasetId, mapping || session.mapping || {});
  const validation = validateMappedRows(datasetId, mappedRows);
  const errors = validation.errors || [];
  if (errors.length > 0) {
    const buffer = buildErrorReportCsv(errors);
    const report = await persistErrorReport(buffer, { sessionId: session.id });
    await updateUploadSession(session.id, {
      mapping: mapping || session.mapping || {},
      validationErrors: errors,
      errorReportId: report.id,
    });
    const error = new Error('Veri doğrulaması başarısız');
    error.code = 'VALIDATION_FAILED';
    error.reportId = report.id;
    throw error;
  }
  await updateUploadSession(session.id, {
    mapping: mapping || session.mapping || {},
    validRows: validation.valid,
  });
  return validation.valid;
}

async function processImportJob(job) {
  const { sessionId, datasetId, mapping, actor } = job.data;
  const session = await getUploadSession(sessionId);
  if (!session) {
    throw new Error('Yükleme oturumu bulunamadı');
  }

  const dataset = getDataset(datasetId || session.datasetId);
  if (!dataset) {
    throw new Error('Veri seti bulunamadı');
  }

  const rows = await ensureValidRows(session, dataset.id, mapping);
  const total = rows.length;
  let processed = 0;
  updateJobSummary(job.id, {
    status: 'running',
    total,
    processed,
    datasetId: dataset.id,
    sessionId,
    startedAt: new Date().toISOString(),
  });

  if (total === 0) {
    await recordAuditLog({
      user: actor?.email || actor?.name || 'unknown',
      action: 'IMPORT_SKIPPED',
      targetType: `dataset:${dataset.id}`,
      targetId: dataset.id,
      details: 'Import edilecek satır bulunamadı.',
      label: 'data-import',
      sourceModule: 'importer',
      criticality: 'low',
    });
    updateJobSummary(job.id, { status: 'completed', processed: 0, total: 0, progress: 100, completedAt: new Date().toISOString() });
    await deleteUploadSession(sessionId);
    return { inserted: 0, updated: 0 };
  }

  const batches = [];
  for (let idx = 0; idx < rows.length; idx += CHUNK_SIZE) {
    batches.push(rows.slice(idx, idx + CHUNK_SIZE));
  }

  let insertedTotal = 0;
  let updatedTotal = 0;

  for (const batch of batches) {
    const result = await applyRowsToCollection(dataset, batch);
    insertedTotal += result.inserted;
    updatedTotal += result.updated;
    processed += batch.length;
    const progressValue = Math.round((processed / total) * 100);
    await job.updateProgress(progressValue);
    updateJobSummary(job.id, {
      processed,
      progress: progressValue,
      inserted: insertedTotal,
      updated: updatedTotal,
    });
  }

  await recordAuditLog({
    user: actor?.email || actor?.name || 'unknown',
    action: 'IMPORT_COMPLETED',
    targetType: `dataset:${dataset.id}`,
    targetId: dataset.id,
    details: `Toplam ${insertedTotal + updatedTotal} satır işlendi. (${insertedTotal} yeni, ${updatedTotal} güncellendi)`,
    label: 'data-import',
    sourceModule: 'importer',
    criticality: 'medium',
  });

  await deleteUploadSession(sessionId);

  updateJobSummary(job.id, {
    status: 'completed',
    processed,
    progress: 100,
    inserted: insertedTotal,
    updated: updatedTotal,
    completedAt: new Date().toISOString(),
  });

  return { inserted: insertedTotal, updated: updatedTotal };
}

async function processExportJob(job) {
  const { datasetId, actor, filters, format = 'csv' } = job.data;
  const dataset = getDataset(datasetId);
  if (!dataset) {
    throw new Error('Veri seti bulunamadı');
  }

  const allRows = await readCollection(dataset.collection);
  const filtered = filterRows(Array.isArray(allRows) ? allRows : [], filters);
  const mappedRows = filtered.map((row) => mapRowForExport(dataset, row));

  const total = mappedRows.length;
  let processed = 0;
  updateJobSummary(job.id, {
    status: 'running',
    total,
    processed,
    datasetId: dataset.id,
    type: 'export',
    startedAt: new Date().toISOString(),
  });

  const batches = [];
  for (let idx = 0; idx < mappedRows.length; idx += CHUNK_SIZE) {
    batches.push(mappedRows.slice(idx, idx + CHUNK_SIZE));
  }

  for (const batch of batches) {
    processed += batch.length;
    const progressValue = total === 0 ? 100 : Math.round((processed / total) * 100);
    await job.updateProgress(progressValue);
    updateJobSummary(job.id, {
      processed,
      progress: progressValue,
    });
  }

  const csv = buildDatasetCsv(dataset, mappedRows);
  const exportFile = await persistExportFile(Buffer.from(csv, 'utf-8'), { jobId: job.id, extension: format === 'xlsx' ? 'csv' : 'csv' });

  await recordAuditLog({
    user: actor?.email || actor?.name || 'unknown',
    action: 'EXPORT_COMPLETED',
    targetType: `dataset:${dataset.id}`,
    targetId: dataset.id,
    details: `Toplam ${total} satır dışa aktarıldı.`,
    label: 'data-export',
    sourceModule: 'importer',
    criticality: 'low',
  });

  updateJobSummary(job.id, {
    status: 'completed',
    processed: total,
    progress: 100,
    completedAt: new Date().toISOString(),
    exportFileId: exportFile.id,
    exportFormat: 'csv',
  });

  return { total, fileId: exportFile.id, format: 'csv' };
}

function createFallbackQueue() {
  const emitter = new EventEmitter();
  return {
    async add(name, data) {
      const jobId = randomUUID();
      updateJobSummary(jobId, {
        id: jobId,
        status: 'queued',
        progress: 0,
        datasetId: data.datasetId,
        sessionId: data.sessionId,
        createdAt: new Date().toISOString(),
        fallback: true,
        type: name,
      });

      setImmediate(async () => {
        try {
          updateJobSummary(jobId, { status: 'running', startedAt: new Date().toISOString() });
          const handler = name === 'export' ? processExportJob : processImportJob;
          await handler({
            id: jobId,
            data,
            updateProgress: async (value) => {
              updateJobSummary(jobId, { progress: value });
              emitter.emit('progress', { jobId, data: value });
            },
          });
          emitter.emit('completed', { jobId });
        } catch (error) {
          updateJobSummary(jobId, {
            status: 'failed',
            error: error.message,
            failedAt: new Date().toISOString(),
            errorReportId: error.reportId,
          });
          emitter.emit('failed', { jobId, failedReason: error.message });
        }
      });

      return { id: jobId };
    },
    async getJob(jobId) {
      const summary = jobSummaries.get(jobId);
      if (!summary) {
        return null;
      }
      return {
        id: jobId,
        data: { sessionId: summary.sessionId, datasetId: summary.datasetId },
        progress: summary.progress,
        returnvalue: summary.returnValue,
      };
    },
    on(event, listener) {
      emitter.on(event, listener);
    },
  };
}

let queuePromise;
let queueInstance;
let workerInstance;
let queueEvents;
let usingFallback = false;

async function bootstrapQueue() {
  if (queuePromise) {
    return queuePromise;
  }

  queuePromise = (async () => {
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      usingFallback = true;
      queueInstance = createFallbackQueue();
      return queueInstance;
    }

    try {
      const connection = process.env.REDIS_URL
        ? new IORedis(process.env.REDIS_URL)
        : new IORedis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT || 6379),
            password: process.env.REDIS_PASSWORD || undefined,
          });

      queueInstance = new Queue(QUEUE_NAME, { connection });
      workerInstance = new Worker(
        QUEUE_NAME,
        async (job) => {
          if (job.name === 'export') {
            return processExportJob(job);
          }
          return processImportJob(job);
        },
        { connection, concurrency: 2 },
      );
      queueEvents = new QueueEvents(QUEUE_NAME, { connection });

      queueEvents.on('completed', ({ jobId }) => {
        updateJobSummary(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        });
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        updateJobSummary(jobId, {
          status: 'failed',
          error: failedReason,
          failedAt: new Date().toISOString(),
        });
      });

      workerInstance.on('progress', (job, progress) => {
        updateJobSummary(job.id, { progress });
      });

      workerInstance.on('failed', (job, error) => {
        updateJobSummary(job.id, {
          status: 'failed',
          error: error?.message || 'Bilinmeyen hata',
          failedAt: new Date().toISOString(),
          errorReportId: error?.reportId,
        });
      });

      workerInstance.on('completed', (job, result) => {
        updateJobSummary(job.id, {
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
          returnValue: result,
        });
      });

      return queueInstance;
    } catch (error) {
      console.warn('[importQueue] Redis bağlantısı kurulamadı, bellek içi kuyruğa geçiliyor.', error);
      usingFallback = true;
      queueInstance = createFallbackQueue();
      return queueInstance;
    }
  })();

  return queuePromise;
}

export async function enqueueImportJob({ sessionId, datasetId, mapping, actor }) {
  const queue = await bootstrapQueue();
  const job = await queue.add('import', { sessionId, datasetId, mapping, actor });
  updateJobSummary(job.id, {
    id: job.id,
    status: 'queued',
    progress: 0,
    datasetId,
    sessionId,
    createdAt: new Date().toISOString(),
    fallback: usingFallback,
    type: 'import',
  });
  return { jobId: job.id };
}

export function getJobStatus(jobId) {
  return jobSummaries.get(jobId) || null;
}

export function isUsingFallbackQueue() {
  return usingFallback;
}

export async function enqueueExportJob({ datasetId, filters, actor }) {
  const queue = await bootstrapQueue();
  const job = await queue.add('export', { datasetId, filters, actor });
  updateJobSummary(job.id, {
    id: job.id,
    status: 'queued',
    progress: 0,
    datasetId,
    createdAt: new Date().toISOString(),
    fallback: usingFallback,
    type: 'export',
  });
  return { jobId: job.id };
}
