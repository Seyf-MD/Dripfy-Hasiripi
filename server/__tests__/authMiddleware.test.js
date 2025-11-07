import assert from 'node:assert/strict';
import { describe, it, before, after, afterEach } from 'node:test';
import jwt from '../lib/jwt.js';

function createMockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(handler, reqOverrides = {}) {
  const req = {
    headers: {},
    cookies: {},
    ...reqOverrides,
  };

  const res = createMockRes();
  let nextCalled = false;

  const next = () => {
    nextCalled = true;
  };

  handler(req, res, next);

  return { res, nextCalled, req };
}

describe('admin authenticate middleware', () => {
  const jwtSecret = 'test-secret-key';
  let authenticate;
  let originalSecret;
  let originalSilenceSetting;

  before(async () => {
    originalSecret = process.env.JWT_SECRET;
    originalSilenceSetting = process.env.SILENCE_AUTH_ERRORS;
    process.env.JWT_SECRET = jwtSecret;
    process.env.SILENCE_AUTH_ERRORS = 'true';
    ({ authenticate } = await import('../auth/middleware.js'));
  });

  afterEach(() => {
    delete process.env.AUTH_COOKIE_NAME;
  });

  after(() => {
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }

    if (originalSilenceSetting) {
      process.env.SILENCE_AUTH_ERRORS = originalSilenceSetting;
    } else {
      delete process.env.SILENCE_AUTH_ERRORS;
    }
  });

  it('rejects requests without credentials', () => {
    const handler = authenticate({ requiredRole: 'admin' });
    const { res, nextCalled } = runMiddleware(handler);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { ok: false, error: 'Authentication required' });
    assert.equal(nextCalled, false);
  });

  it('rejects requests with invalid tokens', () => {
    const handler = authenticate({ requiredRole: 'admin' });
    const { res, nextCalled } = runMiddleware(handler, {
      headers: {
        authorization: 'Bearer this-is-not-valid',
      },
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { ok: false, error: 'Invalid or expired token' });
    assert.equal(nextCalled, false);
  });

  it('rejects requests when user lacks required role', () => {
    const handler = authenticate({ requiredRole: 'admin' });
    const token = jwt.sign(
      { sub: '1', email: 'user@example.com', role: 'editor', name: 'Editor User' },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const { res, nextCalled } = runMiddleware(handler, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { ok: false, error: 'Insufficient permissions' });
    assert.equal(nextCalled, false);
  });

  it('allows requests with a valid admin token and attaches user to req', () => {
    const handler = authenticate({ requiredRole: 'admin' });
    const token = jwt.sign(
      { sub: '42', email: 'admin@example.com', role: 'admin', name: 'Admin User' },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const { res, nextCalled, req } = runMiddleware(handler, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, {
      id: '42',
      email: 'admin@example.com',
      role: 'admin',
      name: 'Admin User',
      capabilities: ['read', 'create', 'update', 'approve', 'delegate', 'admin'],
    });
  });
});
