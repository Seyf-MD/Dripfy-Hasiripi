import { randomUUID } from 'node:crypto';

const DEFAULT_SCOPES = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'offline_access',
];

function getClientId() {
  return process.env.OUTLOOK_CLIENT_ID || process.env.MS_CLIENT_ID || 'mock-outlook-client-id';
}

function getClientSecret() {
  return process.env.OUTLOOK_CLIENT_SECRET || process.env.MS_CLIENT_SECRET || 'mock-outlook-client-secret';
}

function getTenant() {
  return process.env.OUTLOOK_TENANT || 'common';
}

function getAuthEndpoint() {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/authorize`;
}

function getTokenEndpoint() {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/token`;
}

function isMockMode() {
  return process.env.MOCK_CALENDAR === 'true' || !process.env.OUTLOOK_CLIENT_ID;
}

function computeExpiry(expiresIn) {
  const expires = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  if (!expires || Number.isNaN(expires)) {
    return null;
  }
  return new Date(Date.now() + expires * 1000).toISOString();
}

export function buildAuthUrl({ state, redirectUri, scopes = DEFAULT_SCOPES, prompt = 'consent' }) {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    response_mode: 'query',
    prompt,
    state,
  });
  return `${getAuthEndpoint()}?${params.toString()}`;
}

async function requestToken(payload) {
  if (isMockMode()) {
    const now = new Date();
    return {
      token_type: 'Bearer',
      scope: DEFAULT_SCOPES.join(' '),
      expires_in: 3600,
      ext_expires_in: 3600,
      access_token: `mock-outlook-access-${randomUUID()}`,
      refresh_token: `mock-outlook-refresh-${randomUUID()}`,
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
    throw new Error(`Outlook token request failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  return data;
}

export async function exchangeCode({ code, redirectUri }) {
  const payload = {
    client_id: getClientId(),
    client_secret: getClientSecret(),
    scope: DEFAULT_SCOPES.join(' '),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code,
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
    client_id: getClientId(),
    client_secret: getClientSecret(),
    scope: DEFAULT_SCOPES.join(' '),
    redirect_uri: redirectUri,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
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
  // Microsoft Graph supports token revocation but requires tenant-specific endpoints.
  // We skip remote calls in mock mode.
  return true;
}

export async function fetchProfile(tokens) {
  if (isMockMode()) {
    return {
      id: `mock-outlook-${randomUUID()}`,
      email: 'mock.outlook@example.com',
      name: 'Mock Outlook User',
    };
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Outlook profile request failed: ${response.status} ${text}`);
  }
  const profile = await response.json();
  return {
    id: profile.id,
    email: profile.mail || profile.userPrincipalName,
    name: profile.displayName || profile.mail || 'Outlook User',
  };
}

export async function listEvents() {
  return [];
}

export async function upsertEvent() {
  return { status: 'mocked' };
}

export async function deleteEvent() {
  return { status: 'mocked' };
}
