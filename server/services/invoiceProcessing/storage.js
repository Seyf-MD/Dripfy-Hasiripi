import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_INVOICE_DIR = path.resolve(__dirname, '../../data/invoices');

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

let s3Client = null;

function getS3Config() {
  const bucket = process.env.INVOICE_S3_BUCKET || process.env.AWS_S3_BUCKET || null;
  const region = process.env.INVOICE_S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
  const accessKeyId = process.env.INVOICE_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || null;
  const secretAccessKey = process.env.INVOICE_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || null;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return { bucket, region, credentials: { accessKeyId, secretAccessKey } };
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }
  const config = getS3Config();
  if (!config) {
    return null;
  }
  s3Client = new S3Client({
    region: config.region,
    credentials: config.credentials,
  });
  return s3Client;
}

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_INVOICE_DIR, { recursive: true });
}

export function sanitiseFileName(name) {
  if (!name || typeof name !== 'string') {
    return 'invoice';
  }
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function validateInvoiceFile({ size, mimeType }) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    const error = new Error(`Unsupported file type: ${mimeType}`);
    error.code = 'UNSUPPORTED_MEDIA_TYPE';
    throw error;
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    const error = new Error(`File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes`);
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }
}

function buildStorageKey({ sha256, extension }) {
  const timestamp = Date.now();
  const safeExt = extension ? extension.toLowerCase() : '';
  const baseName = `${timestamp}-${sha256}`;
  return {
    localFileName: safeExt ? `${baseName}${safeExt}` : baseName,
    s3Key: `invoices/${baseName}${safeExt}`,
  };
}

export async function persistInvoiceFile({ buffer, originalName, mimeType }) {
  validateInvoiceFile({ size: buffer.length, mimeType });

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const extension = path.extname(originalName || '').slice(0, 12);
  const { localFileName, s3Key } = buildStorageKey({ sha256: hash, extension });
  const safeName = sanitiseFileName(originalName);
  const s3Config = getS3Config();
  const client = getS3Client();

  if (client && s3Config) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          sha256: hash,
          originalname: safeName,
        },
      }));

      return {
        provider: 's3',
        key: s3Key,
        bucket: s3Config.bucket,
        mimeType,
        size: buffer.length,
        sha256: hash,
        originalName: safeName,
        storedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[invoice-storage] Failed to upload to S3, falling back to local storage', error);
    }
  }

  await ensureLocalDir();
  const filePath = path.join(LOCAL_INVOICE_DIR, localFileName);
  await fs.writeFile(filePath, buffer);

  return {
    provider: 'local',
    key: localFileName,
    mimeType,
    size: buffer.length,
    sha256: hash,
    originalName: safeName,
    storedAt: new Date().toISOString(),
  };
}

function resolveLocalPath(key) {
  return path.join(LOCAL_INVOICE_DIR, key);
}

export async function getInvoiceFileStream(storageRef) {
  if (!storageRef || !storageRef.provider) {
    throw new Error('Invalid storage reference');
  }

  if (storageRef.provider === 's3') {
    const client = getS3Client();
    const config = getS3Config();
    if (!client || !config) {
      throw new Error('S3 storage not configured');
    }

    const command = new GetObjectCommand({ Bucket: storageRef.bucket || config.bucket, Key: storageRef.key });
    const result = await client.send(command);
    const body = result.Body;
    if (body instanceof Readable) {
      return { stream: body, contentType: result.ContentType || storageRef.mimeType || 'application/octet-stream' };
    }
    if (body && typeof body.transformToByteArray === 'function') {
      const buffer = Buffer.from(await body.transformToByteArray());
      return { stream: Readable.from(buffer), contentType: result.ContentType || storageRef.mimeType || 'application/octet-stream' };
    }
    throw new Error('Unable to read S3 object stream');
  }

  if (storageRef.provider === 'local') {
    await ensureLocalDir();
    const filePath = resolveLocalPath(storageRef.key);
    return { stream: createReadStream(filePath), contentType: storageRef.mimeType || 'application/octet-stream' };
  }

  throw new Error(`Unsupported storage provider: ${storageRef.provider}`);
}

export async function getInvoiceFileBuffer(storageRef) {
  if (storageRef.provider === 'local') {
    await ensureLocalDir();
    const filePath = resolveLocalPath(storageRef.key);
    return fs.readFile(filePath);
  }
  if (storageRef.provider === 's3') {
    const client = getS3Client();
    const config = getS3Config();
    if (!client || !config) {
      throw new Error('S3 storage not configured');
    }
    const command = new GetObjectCommand({ Bucket: storageRef.bucket || config.bucket, Key: storageRef.key });
    const result = await client.send(command);
    const body = result.Body;
    if (body instanceof Readable) {
      const chunks = [];
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    if (body && typeof body.transformToByteArray === 'function') {
      return Buffer.from(await body.transformToByteArray());
    }
    throw new Error('Unable to read S3 object buffer');
  }
  throw new Error(`Unsupported storage provider: ${storageRef.provider}`);
}

export async function buildInvoicePreviewReference(storageRef, { expiresInSeconds = 5 * 60 } = {}) {
  if (!storageRef) {
    return { url: null, expiresAt: null, type: 'none' };
  }
  if (storageRef.provider === 's3') {
    const client = getS3Client();
    const config = getS3Config();
    if (!client || !config) {
      throw new Error('S3 storage not configured');
    }
    const command = new GetObjectCommand({ Bucket: storageRef.bucket || config.bucket, Key: storageRef.key });
    const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    return {
      url,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
      type: 'signed-url',
    };
  }

  if (storageRef.provider === 'local') {
    const buffer = await getInvoiceFileBuffer(storageRef);
    const mimeType = storageRef.mimeType || 'application/octet-stream';
    const base64 = buffer.toString('base64');
    return {
      url: `data:${mimeType};base64,${base64}`,
      expiresAt: null,
      type: 'data-url',
    };
  }

  return { url: null, expiresAt: null, type: 'none' };
}

export function getInvoiceStoragePolicies() {
  const config = getS3Config();
  const provider = config ? 's3' : 'local';
  return {
    provider,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    encryption: provider === 's3' ? 'AES256 server-side encryption' : 'filesystem permissions',
    retentionDays: Number(process.env.INVOICE_RETENTION_DAYS || 365),
    versioning: provider === 's3' ? 'bucket versioning recommended' : 'manual backups',
  };
}
