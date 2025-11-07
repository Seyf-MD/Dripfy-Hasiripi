import { extractTokenFromRequest, verifyAuthToken } from './token.js';
import { getAuthorisationProfile, userHasRequiredRole } from '../services/auth/authorizationService.js';

export function authenticate({ requiredRole } = {}) {
  return (req, res, next) => {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(403).json({ ok: false, error: 'Authentication required' });
    }

    try {
      const payload = verifyAuthToken(token);
      const profile = getAuthorisationProfile(payload.role);
      req.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
        role: profile.role,
        capabilities: profile.capabilities,
      };

      if (requiredRole && !userHasRequiredRole(profile.role, requiredRole)) {
        return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
      }

      return next();
    } catch (error) {
      if (process.env.NODE_ENV !== 'test' && process.env.SILENCE_AUTH_ERRORS !== 'true') {
        console.error('[auth] Token verification failed:', error);
      }
      return res.status(403).json({ ok: false, error: 'Invalid or expired token' });
    }
  };
}
