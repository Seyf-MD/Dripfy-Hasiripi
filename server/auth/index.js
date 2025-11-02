import express from 'express';
import {
  findUserByEmail,
  mapUserToPublic,
  setLastLogin,
  updateUserPassword,
  verifyPassword,
} from '../services/userService.js';
import { recordLoginEvent } from '../services/logService.js';
import { createAuthToken, getAuthCookieName, getCookieOptions } from './token.js';

const router = express.Router();
const passwordResets = new Map();
const PASSWORD_RESET_TTL = 15 * 60 * 1000;

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storeResetCode(email, code) {
  const normalised = email.trim().toLowerCase();
  const expires = Date.now() + PASSWORD_RESET_TTL;
  passwordResets.set(normalised, { code, expires });
}

function validateResetCode(email, code) {
  const normalised = email.trim().toLowerCase();
  const entry = passwordResets.get(normalised);
  if (!entry) return false;
  if (entry.expires < Date.now()) {
    passwordResets.delete(normalised);
    return false;
  }
  return entry.code === code;
}

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    const passwordValid = await verifyPassword(user, password);
    if (!passwordValid) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    const token = createAuthToken(user);
    const cookieName = getAuthCookieName();
    const cookieOptions = getCookieOptions();

    res.cookie(cookieName, token, cookieOptions);

    const loginTime = new Date();
    try {
      await setLastLogin(user.id, loginTime);
      user.lastLogin = loginTime.toISOString();
    } catch (error) {
      console.error('[auth] Failed to update last login:', error);
    }

    try {
      await recordLoginEvent({
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: loginTime.toISOString(),
      });
    } catch (error) {
      console.error('[auth] Failed to record login event:', error);
    }

    return res.json({
      ok: true,
      token,
      user: mapUserToPublic(user),
    });
  } catch (error) {
    console.error('[auth] Login failed:', error);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  const cookieName = getAuthCookieName();
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res.json({ ok: true });
});

router.post('/password/request', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.json({ ok: true });
    }

    const code = generateResetCode();
    storeResetCode(email, code);
    console.log(`[auth] Password reset code for ${email}: ${code}`);

    const response = { ok: true };
    if (process.env.NODE_ENV !== 'production') {
      response.code = code;
    }
    return res.json(response);
  } catch (error) {
    console.error('[auth] Password reset request failed:', error);
    return res.status(500).json({ ok: false, error: 'Password reset request failed' });
  }
});

router.post('/password/reset', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !code || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Email, code, and password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters long' });
  }

  if (!validateResetCode(email, code)) {
    return res.status(400).json({ ok: false, error: 'Invalid or expired reset code' });
  }

  try {
    const updated = await updateUserPassword(email, newPassword);
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    passwordResets.delete(email.trim().toLowerCase());
    return res.json({ ok: true });
  } catch (error) {
    console.error('[auth] Password reset failed:', error);
    return res.status(500).json({ ok: false, error: 'Password reset failed' });
  }
});

export default router;
