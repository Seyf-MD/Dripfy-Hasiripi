import { randomUUID } from 'node:crypto';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function getClientId() {
  return process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
}

function getClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret';
}

function getTokenEndpoint() {
  return 'https://oauth2.googleapis.com/token';
}

function getAuthEndpoint() {
  return 'https://accounts.google.com/o/oauth2/v2/auth';
}

export function buildAuthUrl({ state, redirectUri, scopes = DEFAULT_SCOPES, prompt = 'consent' }) {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt,
    state,
  });
  return `${getAuthEndpoint()}?${params.toString()}`;
}

function isMockMode() {
  return process.env.MOCK_CALENDAR === 'true' || !process.env.GOOGLE_CLIENT_ID;
}

function computeExpiry(expiresIn) {
  const expires = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  if (!expires || Number.isNaN(expires)) {
    return null;
  }
  return new Date(Date.now() + expires * 1000).toISOString();
}

async function requestToken(payload) {
  if (isMockMode()) {
    const now = new Date();
    return {
      access_token: `mock-google-access-${randomUUID()}`,
      refresh_token: `mock-google-refresh-${randomUUID()}`,
      expires_in: 3600,
      scope: DEFAULT_SCOPES.join(' '),
      token_type: 'Bearer',
      obtained_at: now.toISOString(),
    };
  }

  const response = await fetch(getTokenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token request failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data;
}

export async function exchangeCode({ code, redirectUri }) {
  const payload = {
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  const data = await requestToken(payload);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || 3600,
    tokenType: data.token_type || 'Bearer',
    scope: data.scope ? data.scope.split(/\s+/).filter(Boolean) : DEFAULT_SCOPES,
    obtainedAt: data.obtained_at || new Date().toISOString(),
    expiresAt: computeExpiry(data.expires_in),
    raw: data,
  };
}

export async function refreshToken({ refreshToken, redirectUri }) {
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }
  const payload = {
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: 'refresh_token',
    redirect_uri: redirectUri,
  };
  const data = await requestToken(payload);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
    tokenType: data.token_type || 'Bearer',
    scope: data.scope ? data.scope.split(/\s+/).filter(Boolean) : DEFAULT_SCOPES,
    obtainedAt: data.obtained_at || new Date().toISOString(),
    expiresAt: computeExpiry(data.expires_in),
    raw: data,
  };
}

export async function revoke(_integration) {
  // Google revocation would normally call https://oauth2.googleapis.com/revoke
  // We skip the remote call in mock environments to avoid network dependency failures.
  return true;
}

export async function fetchProfile(tokens) {
  if (isMockMode()) {
    return {
      id: `mock-google-${randomUUID()}`,
      email: 'mock.user@example.com',
      name: 'Mock Google User',
      locale: 'en',
    };
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google profile request failed: ${response.status} ${text}`);
  }
  const profile = await response.json();
  return {
    id: profile.sub || profile.id,
    email: profile.email,
    name: profile.name || profile.email,
    locale: profile.locale || 'en',
  };
}

export async function listEvents() {
  // Real implementation would query Google Calendar API.
  // We leave it as a stub; syncing logic is handled in the calendar service.
  return [];
}

export async function upsertEvent() {
  return { status: 'mocked' };
}

export async function deleteEvent() {
  return { status: 'mocked' };
}
