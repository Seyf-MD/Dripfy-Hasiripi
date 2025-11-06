import express from 'express';
import multer from 'multer';
import { authenticate } from '../auth/middleware.js';
import {
  processInvoiceUpload,
  listInvoices,
  getInvoiceById,
  generateInvoicePreview,
  getInvoiceSecurityPolicies,
  getInvoiceFileStreamById,
} from '../services/invoiceProcessing/index.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../services/invoiceProcessing/storage.js';

export const invoicesRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'));
  },
});

function parseMetadata(raw) {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'object') {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return { note: raw };
    }
  }
  return {};
}

invoicesRouter.use(authenticate());

invoicesRouter.get('/policies', (_req, res) => {
  res.json({ ok: true, policies: getInvoiceSecurityPolicies() });
});

invoicesRouter.get('/', async (_req, res) => {
  const invoices = await listInvoices();
  res.json({ ok: true, invoices });
});

invoicesRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ ok: false, error: { message: 'Dosya bulunamadı' } });
      return;
    }

    const actor = req.user || null;
    const metadata = parseMetadata(req.body?.metadata);

    const invoice = await processInvoiceUpload({
      file: req.file,
      actor,
      metadata,
    });

    res.status(201).json({ ok: true, invoice });
  } catch (error) {
    console.error('[invoices] upload failed', error);
    const message = error instanceof Error ? error.message : 'Fatura yükleme başarısız';
    const status = error?.code === 'UNSUPPORTED_MEDIA_TYPE' ? 415
      : error?.code === 'FILE_TOO_LARGE' ? 413
        : 400;
    res.status(status).json({ ok: false, error: { message } });
  }
});

invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);
  if (!invoice) {
    res.status(404).json({ ok: false, error: { message: 'Fatura bulunamadı' } });
    return;
  }
  res.json({ ok: true, invoice });
});

invoicesRouter.get('/:id/preview', async (req, res) => {
  try {
    const preview = await generateInvoicePreview(req.params.id);
    res.json({ ok: true, preview });
  } catch (error) {
    console.error('[invoices] preview failed', error);
    res.status(404).json({ ok: false, error: { message: 'Önizleme oluşturulamadı' } });
  }
});

invoicesRouter.get('/:id/file', async (req, res, next) => {
  try {
    const { stream, contentType } = await getInvoiceFileStreamById(req.params.id);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    stream.on('error', (error) => {
      next(error);
    });
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

invoicesRouter.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Dosya boyutu limitini aşıyor' : 'Dosya kabul edilmedi';
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ok: false, error: { message } });
    return;
  }
  console.error('[invoices] unexpected error', error);
  res.status(500).json({ ok: false, error: { message: 'Beklenmeyen hata oluştu' } });
});

export default invoicesRouter;
