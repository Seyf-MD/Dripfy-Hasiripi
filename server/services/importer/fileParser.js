import { Buffer } from 'buffer';
import { parse as parseCsv } from 'csv-parse/sync';
import XLSX from 'xlsx';

const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

const CSV_EXTENSIONS = ['.csv', '.txt'];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function isMimeTypeAllowed(mimeType = '') {
  if (!mimeType) {
    return false;
  }
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isCsv(filename = '') {
  const lower = filename.toLowerCase();
  return CSV_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function parseCsvBuffer(buffer) {
  const content = buffer.toString('utf-8');
  return parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

export function parseUploadedFile({ buffer, originalname, mimetype }) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Dosya okunamadı');
  }
  if (buffer.length === 0) {
    return { rows: [], columns: [] };
  }

  let rows = [];
  if (isCsv(originalname) || mimetype === 'text/csv') {
    rows = parseCsvBuffer(buffer);
  } else {
    rows = parseExcelBuffer(buffer);
  }

  if (!Array.isArray(rows)) {
    throw new Error('Dosya formatı desteklenmiyor');
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns };
}

export function buildErrorReportCsv(errors) {
  const header = ['row', 'field', 'message'];
  const lines = [header.join(',')];
  for (const error of errors) {
    const row = [error.row, error.field, (error.message || '').replace(/"/g, '""')]
      .map((value) => {
        const safe = value == null ? '' : String(value);
        return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
      })
      .join(',');
    lines.push(row);
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}

export function getAllowedMimeTypes() {
  return [...ALLOWED_MIME_TYPES];
}
