import crypto from 'crypto';

export const SIGNUP_CODE_TTL = Number(process.env.SIGNUP_CODE_TTL || 10 * 60 * 1000);
export const MAX_SIGNUP_CODE_ATTEMPTS = Number(process.env.SIGNUP_CODE_MAX_ATTEMPTS || 5);
const SIGNUP_CODE_SECRET =
  process.env.SIGNUP_CODE_SECRET || process.env.JWT_SECRET || 'dev-signup-secret';

export const signupCodeStore = new Map();

export function createSignupCodeStore() {
  return new Map();
}

export function normaliseEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function hashVerificationCode(code, secret = SIGNUP_CODE_SECRET) {
  const normalizedCode = typeof code === 'string' ? code : '';
  return crypto.createHmac('sha256', secret).update(normalizedCode).digest('hex');
}

export function createSignupCodeRecord({
  email,
  code,
  payload,
  ttl = SIGNUP_CODE_TTL,
  now = Date.now,
  secret = SIGNUP_CODE_SECRET,
  store = signupCodeStore,
}) {
  const key = normaliseEmail(email);
  if (!key) {
    throw new Error('E-posta gerekli');
  }

  const hash = hashVerificationCode(code, secret);
  const expiresAt = now() + ttl;
  const entry = {
    hash,
    expiresAt,
    attempts: 0,
    payload,
  };

  store.set(key, entry);
  return entry;
}

export function getSignupCodeRecord(email, store = signupCodeStore) {
  return store.get(normaliseEmail(email));
}

export function deleteSignupCodeRecord(email, store = signupCodeStore) {
  store.delete(normaliseEmail(email));
}

export function hasSignupCodeExpired(entry, now = Date.now()) {
  if (!entry) {
    return true;
  }
  return entry.expiresAt <= now;
}

export function verifySignupCodeAttempt({
  email,
  code,
  now = Date.now(),
  secret = SIGNUP_CODE_SECRET,
  maxAttempts = MAX_SIGNUP_CODE_ATTEMPTS,
  store = signupCodeStore,
}) {
  const key = normaliseEmail(email);
  if (!key) {
    return { status: 'invalid-request' };
  }

  const entry = store.get(key);
  if (!entry) {
    return { status: 'not-found' };
  }

  if (hasSignupCodeExpired(entry, now)) {
    store.delete(key);
    return { status: 'expired' };
  }

  const expected = Buffer.from(entry.hash, 'hex');
  const actual = Buffer.from(hashVerificationCode(code, secret), 'hex');

  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    entry.attempts += 1;

    if (entry.attempts >= maxAttempts) {
      store.delete(key);
      return { status: 'locked' };
    }

    return { status: 'mismatch', attempts: entry.attempts };
  }

  store.delete(key);
  return { status: 'valid', payload: entry.payload };
}
