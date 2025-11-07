import type {
  PortalDocumentRecord,
  PortalDocumentVersion,
  PortalDocumentApprovalState,
} from '../../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const PORTAL_BASE = API_BASE ? `${API_BASE}/api/portal` : '/api/portal';

interface RequestOptions {
  token?: string;
}

function buildHeaders(options?: RequestOptions): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  if (!response.ok) {
    const message = data?.error?.message || response.statusText || 'Belge işlemi başarısız';
    throw new Error(message);
  }
  return data as T;
}

export interface CreatePortalDocumentInput {
  title: string;
  description?: string;
  category?: string;
}

interface CreateDocumentResponse {
  ok: boolean;
  document: PortalDocumentRecord;
}

export async function createPortalDocument(payload: CreatePortalDocumentInput, options?: RequestOptions): Promise<PortalDocumentRecord> {
  const response = await fetch(`${PORTAL_BASE}/documents`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(options),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<CreateDocumentResponse>(response);
  return data.document;
}

export interface UploadPortalDocumentVersionInput {
  fileName: string;
  notes?: string;
}

interface UploadVersionResponse {
  ok: boolean;
  version: PortalDocumentVersion;
}

export async function uploadPortalDocumentVersion(
  documentId: string,
  payload: UploadPortalDocumentVersionInput,
  options?: RequestOptions,
): Promise<PortalDocumentVersion> {
  const response = await fetch(`${PORTAL_BASE}/documents/${encodeURIComponent(documentId)}/versions`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(options),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<UploadVersionResponse>(response);
  return data.version;
}

interface GenerateLinkResponse {
  ok: boolean;
  link: { url: string; expiresAt: string };
}

export async function generatePortalDocumentLink(
  documentId: string,
  versionId: string,
  expiresInMinutes?: number,
  options?: RequestOptions,
): Promise<{ url: string; expiresAt: string }> {
  const response = await fetch(`${PORTAL_BASE}/documents/${encodeURIComponent(documentId)}/secure-link`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(options),
    body: JSON.stringify({ versionId, expiresInMinutes }),
  });
  const data = await parseResponse<GenerateLinkResponse>(response);
  return data.link;
}

export interface UpdatePortalDocumentApprovalInput {
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface UpdateApprovalResponse {
  ok: boolean;
  approval: PortalDocumentApprovalState;
}

export async function updatePortalDocumentApproval(
  documentId: string,
  payload: UpdatePortalDocumentApprovalInput,
  options?: RequestOptions,
): Promise<PortalDocumentApprovalState> {
  const response = await fetch(`${PORTAL_BASE}/documents/${encodeURIComponent(documentId)}/approval`, {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(options),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<UpdateApprovalResponse>(response);
  return data.approval;
}
