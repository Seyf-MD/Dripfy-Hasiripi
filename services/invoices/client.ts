import { InvoiceDocument, InvoicePreviewReference } from '../../types';

interface ApiResponse<T> {
  ok: boolean;
  invoices?: T;
  policies?: unknown;
  invoice?: T;
  preview?: InvoicePreviewReference;
  error?: { message?: string };
}

const API_BASE = '/api/invoices';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: { message: 'İstek başarısız' } }))) as ApiResponse<T>;
    const message = payload.error?.message || response.statusText || 'İstek başarısız';
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function fetchInvoices(signal?: AbortSignal): Promise<InvoiceDocument[]> {
  const response = await fetch(`${API_BASE}`, {
    method: 'GET',
    credentials: 'include',
    signal,
    headers: { 'Accept': 'application/json' },
  });
  const payload = await handleResponse<ApiResponse<InvoiceDocument[]>>(response);
  return payload.invoices ?? [];
}

export async function fetchInvoicePolicies(): Promise<unknown> {
  const response = await fetch(`${API_BASE}/policies`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  const payload = await handleResponse<ApiResponse<unknown>>(response);
  return payload.policies;
}

export async function fetchInvoiceById(id: string, signal?: AbortSignal): Promise<InvoiceDocument | null> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    credentials: 'include',
    signal,
    headers: { 'Accept': 'application/json' },
  });
  if (response.status === 404) {
    return null;
  }
  const payload = await handleResponse<ApiResponse<InvoiceDocument>>(response);
  return payload.invoice ?? null;
}

export async function fetchInvoicePreview(id: string, signal?: AbortSignal): Promise<InvoicePreviewReference | null> {
  const response = await fetch(`${API_BASE}/${id}/preview`, {
    method: 'GET',
    credentials: 'include',
    signal,
    headers: { 'Accept': 'application/json' },
  });
  if (response.status === 404) {
    return null;
  }
  const payload = await handleResponse<ApiResponse<InvoicePreviewReference>>(response);
  return payload.preview ?? null;
}
