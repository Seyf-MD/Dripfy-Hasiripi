import express from 'express';
import multer from 'multer';
import { authenticate } from '../auth/middleware.js';
import {
  canExportDataset,
  canImportDataset,
  getDataset,
  getDatasetFieldDefinitions,
  listDatasetsForRole,
} from '../services/importer/datasetRegistry.js';
import {
  createUploadSession,
  getUploadSession,
  updateUploadSession,
  persistErrorReport,
  readErrorReport,
  readExportFile,
} from '../services/importer/uploadStore.js';
import {
  parseUploadedFile,
  MAX_FILE_SIZE_BYTES,
  isMimeTypeAllowed,
  isCsv,
  getAllowedMimeTypes,
  buildErrorReportCsv,
} from '../services/importer/fileParser.js';
import { applyFieldMapping } from '../services/importer/mappingService.js';
import { validateMappedRows } from '../services/importer/validationService.js';
import {
  enqueueImportJob,
  enqueueExportJob,
  getJobStatus,
  isUsingFallbackQueue,
} from '../services/importer/importQueue.js';
import { recordAuditLog } from '../services/logService.js';
import { isRoleAtLeast } from '../models/roleModel.js';

const importerRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isMimeTypeAllowed(file.mimetype) || isCsv(file.originalname)) {
      cb(null, true);
      return;
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
  },
});

function buildSuggestedMapping(dataset, columns) {
  const suggestions = {};
  const lowerColumns = columns.map((column) => column.toLowerCase());
  Object.entries(dataset.fields).forEach(([field, definition]) => {
    const candidates = [field.toLowerCase(), (definition.label || '').toLowerCase()];
    const matchIndex = lowerColumns.findIndex((column) => candidates.includes(column));
    if (matchIndex !== -1) {
      suggestions[field] = columns[matchIndex];
    }
  });
  return suggestions;
}

function sanitiseMapping(input) {
  if (!input || typeof input !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input)
      .map(([field, column]) => [field, typeof column === 'string' ? column.trim() : null])
      .filter(([, column]) => column),
  );
}

async function assertUploadAccess(req, session) {
  if (!session) {
    const error = new Error('Oturum bulunamadı');
    error.statusCode = 404;
    throw error;
  }
  if (session.userId && session.userId !== req.user.id && !isRoleAtLeast(req.user.role, 'admin')) {
    const error = new Error('Bu yüklemeye erişiminiz yok');
    error.statusCode = 403;
    throw error;
  }
}

importerRouter.use(authenticate());

importerRouter.get('/datasets', (req, res) => {
  const datasets = listDatasetsForRole(req.user.role).map((dataset) => ({
    id: dataset.id,
    label: dataset.label,
    description: dataset.description,
    canImport: canImportDataset(req.user.role, dataset.id),
    canExport: canExportDataset(req.user.role, dataset.id),
    fields: getDatasetFieldDefinitions(dataset.id),
  }));
  res.json({
    ok: true,
    datasets,
    queue: { fallback: isUsingFallbackQueue() },
    allowedMimeTypes: getAllowedMimeTypes(),
    maxFileSize: MAX_FILE_SIZE_BYTES,
  });
});

importerRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const datasetId = req.body?.datasetId;
    const dataset = datasetId ? getDataset(datasetId) : null;
    if (!dataset) {
      res.status(400).json({ ok: false, error: { message: 'Geçersiz veri seti' } });
      return;
    }
    if (!canImportDataset(req.user.role, dataset.id)) {
      res.status(403).json({ ok: false, error: { message: 'Bu veri setini içe aktarma yetkiniz yok' } });
      return;
    }
    if (!req.file) {
      res.status(400).json({ ok: false, error: { message: 'Dosya yüklenmedi' } });
      return;
    }

    const { rows, columns } = parseUploadedFile(req.file);
    const session = await createUploadSession({
      datasetId: dataset.id,
      userId: req.user.id,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      columns,
      rows,
    });

    res.json({
      ok: true,
      sessionId: session.id,
      dataset: {
        id: dataset.id,
        label: dataset.label,
        description: dataset.description,
      },
      columns,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 5),
      requiredFields: getDatasetFieldDefinitions(dataset.id),
      suggestedMapping: buildSuggestedMapping(dataset, columns),
    });
  } catch (error) {
    console.error('[importer] upload failed', error);
    const status = error instanceof multer.MulterError ? 400 : 500;
    res.status(status).json({
      ok: false,
      error: { message: error.message || 'Dosya işlenemedi' },
    });
  }
});

importerRouter.post('/sessions/:sessionId/validate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const mapping = sanitiseMapping(req.body?.mapping || {});
    const commit = Boolean(req.body?.commit);
    const session = await getUploadSession(sessionId);
    await assertUploadAccess(req, session);

    const dataset = getDataset(session.datasetId);
    if (!dataset) {
      res.status(400).json({ ok: false, error: { message: 'Veri seti bulunamadı' } });
      return;
    }

    const mappedRows = applyFieldMapping(session.rows || [], dataset.id, mapping);
    const { valid, errors } = validateMappedRows(dataset.id, mappedRows);

    let errorReportId = null;
    if (errors.length > 0) {
      const buffer = buildErrorReportCsv(errors);
      const report = await persistErrorReport(buffer, { sessionId });
      errorReportId = report.id;
    }

    await updateUploadSession(sessionId, {
      mapping,
      validRows: valid,
      validationSummary: {
        total: mappedRows.length,
        valid: valid.length,
        invalid: errors.length,
      },
      validationErrors: errors,
      errorReportId,
    });

    if (commit && errors.length === 0) {
      const { jobId } = await enqueueImportJob({
        sessionId,
        datasetId: dataset.id,
        mapping,
        actor: req.user,
      });
      res.json({
        ok: true,
        summary: {
          total: mappedRows.length,
          valid: valid.length,
          invalid: errors.length,
        },
        jobId,
      });
      return;
    }

    res.json({
      ok: true,
      summary: {
        total: mappedRows.length,
        valid: valid.length,
        invalid: errors.length,
      },
      previewErrors: errors.slice(0, 25),
      errorReportId,
    });
  } catch (error) {
    console.error('[importer] validate failed', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      ok: false,
      error: { message: error.message || 'Veri doğrulaması başarısız' },
    });
  }
});

importerRouter.post('/sessions/:sessionId/commit', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const mapping = sanitiseMapping(req.body?.mapping || {});
    const session = await getUploadSession(sessionId);
    await assertUploadAccess(req, session);

    const dataset = getDataset(session.datasetId);
    if (!dataset) {
      res.status(400).json({ ok: false, error: { message: 'Veri seti bulunamadı' } });
      return;
    }
    if (!canImportDataset(req.user.role, dataset.id)) {
      res.status(403).json({ ok: false, error: { message: 'Bu veri setini içe aktarma yetkiniz yok' } });
      return;
    }

    const effectiveMapping = Object.keys(mapping).length ? mapping : session.mapping || {};
    if (!Object.keys(effectiveMapping).length) {
      res.status(400).json({ ok: false, error: { message: 'Alan eşlemesi tamamlanmalıdır' } });
      return;
    }

    const { jobId } = await enqueueImportJob({
      sessionId,
      datasetId: dataset.id,
      mapping: effectiveMapping,
      actor: req.user,
    });

    await recordAuditLog({
      user: req.user.email || req.user.name || req.user.id,
      action: 'IMPORT_ENQUEUED',
      targetType: `dataset:${dataset.id}`,
      targetId: sessionId,
      details: `${session.filename} içe aktarma kuyruğa alındı`,
      label: 'data-import',
      sourceModule: 'importer',
      criticality: 'medium',
    });

    res.json({ ok: true, jobId });
  } catch (error) {
    console.error('[importer] commit failed', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      ok: false,
      error: { message: error.message || 'İçe aktarma başlatılamadı' },
    });
  }
});

importerRouter.post('/export', async (req, res) => {
  try {
    const datasetId = req.body?.datasetId;
    const filters = req.body?.filters || {};
    const dataset = datasetId ? getDataset(datasetId) : null;
    if (!dataset) {
      res.status(400).json({ ok: false, error: { message: 'Geçersiz veri seti' } });
      return;
    }
    if (!canExportDataset(req.user.role, dataset.id)) {
      res.status(403).json({ ok: false, error: { message: 'Bu veri setini dışa aktarma yetkiniz yok' } });
      return;
    }

    const { jobId } = await enqueueExportJob({ datasetId: dataset.id, filters, actor: req.user });

    await recordAuditLog({
      user: req.user.email || req.user.name || req.user.id,
      action: 'EXPORT_ENQUEUED',
      targetType: `dataset:${dataset.id}`,
      targetId: jobId,
      details: `${dataset.label} dışa aktarma kuyruğa alındı`,
      label: 'data-export',
      sourceModule: 'importer',
      criticality: 'low',
    });

    res.json({ ok: true, jobId });
  } catch (error) {
    console.error('[importer] export failed', error);
    res.status(500).json({ ok: false, error: { message: 'Dışa aktarma başlatılamadı' } });
  }
});

importerRouter.get('/jobs/:jobId', (req, res) => {
  const summary = getJobStatus(req.params.jobId);
  if (!summary) {
    res.status(404).json({ ok: false, error: { message: 'İş bulunamadı' } });
    return;
  }
  res.json({ ok: true, job: summary });
});

importerRouter.get('/errors/:reportId', async (req, res) => {
  try {
    const report = await readErrorReport(req.params.reportId);
    if (!report) {
      res.status(404).json({ ok: false, error: { message: 'Rapor bulunamadı' } });
      return;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${req.params.reportId}.csv"`);
    res.send(report.buffer);
  } catch (error) {
    console.error('[importer] download error report failed', error);
    res.status(500).json({ ok: false, error: { message: 'Hata raporu indirilemedi' } });
  }
});

importerRouter.get('/exports/:jobId/file', async (req, res) => {
  try {
    const job = getJobStatus(req.params.jobId);
    if (!job || job.status !== 'completed' || !job.exportFileId) {
      res.status(404).json({ ok: false, error: { message: 'Dışa aktarma hazır değil' } });
      return;
    }
    const file = await readExportFile(job.exportFileId);
    if (!file) {
      res.status(404).json({ ok: false, error: { message: 'Dosya bulunamadı' } });
      return;
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export-${job.datasetId}-${job.exportFileId}.csv"`);
    res.send(file.buffer);
  } catch (error) {
    console.error('[importer] download export failed', error);
    res.status(500).json({ ok: false, error: { message: 'Dosya indirilemedi' } });
  }
});

export default importerRouter;
