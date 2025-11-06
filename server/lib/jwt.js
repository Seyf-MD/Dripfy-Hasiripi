import { createHmac, timingSafeEqual } from 'node:crypto';

class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

class TokenExpiredError extends JsonWebTokenError {
  constructor(message, expiredAt) {
    super(message);
    this.name = 'TokenExpiredError';
    this.expiredAt = expiredAt;
  }
}

const DEFAULT_ALG = 'HS256';

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64');
}

function safeJsonParse(buffer, errorMessage) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    throw new JsonWebTokenError(errorMessage);
  }
}

function parseExpiresIn(expiresIn) {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    return Math.floor(expiresIn);
  }

  if (typeof expiresIn !== 'string' || expiresIn.trim() === '') {
    throw new JsonWebTokenError('"expiresIn" should be a number of seconds or a string representing a timespan');
  }

  const match = /^([0-9]+)([smhd])$/.exec(expiresIn.trim());
  if (!match) {
    throw new JsonWebTokenError('"expiresIn" format is invalid');
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const unitMap = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * unitMap[unit];
}

function createSignature(input, secret) {
  return createHmac('sha256', secret).update(input).digest();
}

export function sign(payload, secret, options = {}) {
  if (!secret) {
    throw new JsonWebTokenError('secret or public key must be provided');
  }

  const header = { alg: DEFAULT_ALG, typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = { ...payload };

  if (options.expiresIn) {
    body.exp = issuedAt + parseExpiresIn(options.expiresIn);
  }

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = createSignature(signingInput, secret);
  const signatureSegment = base64UrlEncode(signature);

  return `${signingInput}.${signatureSegment}`;
}

export function verify(token, secret) {
  if (!secret) {
    throw new JsonWebTokenError('secret or public key must be provided');
  }

  if (typeof token !== 'string') {
    throw new JsonWebTokenError('jwt must be a string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JsonWebTokenError('jwt malformed');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createSignature(signingInput, secret);
  let signature;

  try {
    signature = base64UrlDecode(encodedSignature);
  } catch (error) {
    throw new JsonWebTokenError('jwt malformed');
  }

  if (expectedSignature.length !== signature.length || !timingSafeEqual(expectedSignature, signature)) {
    throw new JsonWebTokenError('invalid signature');
  }

  const payload = safeJsonParse(base64UrlDecode(encodedPayload), 'jwt malformed');

  if (payload.exp && typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) {
      throw new TokenExpiredError('jwt expired', new Date(payload.exp * 1000));
    }
  }

  return payload;
}

export { JsonWebTokenError, TokenExpiredError };

const jwt = { sign, verify, JsonWebTokenError, TokenExpiredError };

export default jwt;
