import express from 'express';
import { findUserByEmail, mapUserToPublic, verifyPassword } from '../services/userService.js';
import { createAuthToken, getAuthCookieName, getCookieOptions } from './token.js';

const router = express.Router();

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

export default router;
