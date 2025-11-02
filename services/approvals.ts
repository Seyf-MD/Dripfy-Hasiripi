import { ApprovalDecisionPayload, ApprovalFlowSummary, ApprovalFlowType } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await parseJson(response);
  if (!response.ok || data?.ok === false) {
    const message = data?.error || fallbackMessage;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchApprovalFlows(options: { token?: string; type?: ApprovalFlowType | null } = {}): Promise<ApprovalFlowSummary[]> {
  const params = new URLSearchParams();
  if (options.type) {
    params.set('type', options.type);
  }
  const response = await fetch(buildUrl(`/api/approvals/flows${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
    credentials: 'include',
  });
  const payload = await handleResponse<{ flows: ApprovalFlowSummary[] }>(response, 'Onay akışları yüklenemedi.');
  return Array.isArray(payload.flows) ? payload.flows : [];
}

export async function submitApprovalDecision(args: {
  flowType: ApprovalFlowType;
  entityId: string;
  stepId: string;
  payload: ApprovalDecisionPayload;
  token?: string;
}): Promise<ApprovalFlowSummary> {
  const response = await fetch(
    buildUrl(`/api/approvals/flows/${args.flowType}/${args.entityId}/steps/${args.stepId}/decision`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(args.payload),
    },
  );
  const payload = await handleResponse<{ flow: ApprovalFlowSummary }>(response, 'Onay kararı işlenemedi.');
  if (!payload.flow) {
    throw new Error('Sunucu onay akışını döndürmedi.');
  }
  return payload.flow;
}
