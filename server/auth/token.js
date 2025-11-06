import jwt from '../lib/jwt.js';

const DEFAULT_EXPIRY = '15m';
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'dripfy_admin_token';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRY;
const COOKIE_MAX_AGE = process.env.JWT_COOKIE_MAX_AGE || JWT_EXPIRES_IN;

function parseDurationToMs(value) {
  if (!value) {
    return 15 * 60 * 1000;
  }
  if (/^\d+$/.test(value)) {
    return Number(value) * 1000;
  }
  const match = /^([0-9]+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * unitMap[unit];
}

export function createAuthToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, JWT_SECRET);
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: parseDurationToMs(COOKIE_MAX_AGE),
  };
}

export function extractTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieName = getAuthCookieName();
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  return null;
}
