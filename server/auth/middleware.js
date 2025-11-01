import { extractTokenFromRequest, verifyAuthToken } from './token.js';

export function authenticate({ requiredRole } = {}) {
  return (req, res, next) => {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    try {
      const payload = verifyAuthToken(token);
      req.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };

      if (requiredRole && req.user.role !== requiredRole) {
        return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      console.error('[auth] Token verification failed:', error);
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }
  };
}
