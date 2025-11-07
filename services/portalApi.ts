import type {
  StakeholderPortalState,
  PortalSupportRequest,
  PortalMessage,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const PORTAL_BASE = API_BASE ? `${API_BASE}/api/portal` : '/api/portal';

interface FetchOptions {
  token?: string;
}

function buildHeaders(options?: FetchOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  if (!response.ok) {
    const message = data?.error?.message || response.statusText || 'İstek başarısız oldu';
    throw new Error(message);
  }
  return data as T;
}

export interface PortalOverviewResponse {
  ok: boolean;
  overview: StakeholderPortalState | null;
}

export async function fetchPortalOverview(options?: FetchOptions & { profileId?: string }): Promise<StakeholderPortalState | null> {
  const base = typeof window !== 'undefined' ? PORTAL_BASE : `${PORTAL_BASE}`;
  const url = new URL(`${base}/overview`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (options?.profileId) {
    url.searchParams.set('profileId', options.profileId);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(options),
    credentials: 'include',
  });
  const data = await handleResponse<PortalOverviewResponse>(response);
  return data.overview ?? null;
}

export async function acknowledgePortalStatus(statusId: string, options?: FetchOptions): Promise<void> {
  const response = await fetch(`${PORTAL_BASE}/status/${encodeURIComponent(statusId)}/acknowledge`, {
    method: 'POST',
    headers: {
      ...buildHeaders(options),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  await handleResponse(response);
}

export interface SupportRequestInput {
  subject: string;
  message: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface SupportResponse {
  ok: boolean;
  request: PortalSupportRequest;
}

export async function submitPortalSupportRequest(payload: SupportRequestInput, options?: FetchOptions): Promise<PortalSupportRequest> {
  const response = await fetch(`${PORTAL_BASE}/support`, {
    method: 'POST',
    headers: {
      ...buildHeaders(options),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<SupportResponse>(response);
  return data.request;
}

export interface PortalMessageInput {
  body: string;
  direction?: 'inbound' | 'outbound';
  attachments?: { name: string; url: string }[];
}

interface PortalMessageResponse {
  ok: boolean;
  message: PortalMessage;
}

export async function sendPortalMessage(payload: PortalMessageInput, options?: FetchOptions): Promise<PortalMessage> {
  const response = await fetch(`${PORTAL_BASE}/messages`, {
    method: 'POST',
    headers: {
      ...buildHeaders(options),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<PortalMessageResponse>(response);
  return data.message;
}
