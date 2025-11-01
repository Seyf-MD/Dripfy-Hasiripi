export interface SignupCodePayload {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  position: string;
  company?: string;
  country?: string;
}

export interface SignupFinalizePayload {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  countryCode?: string;
  country?: string;
  phone: string;
  position: string;
  company?: string;
  status: 'pending';
  timestamp: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const SEND_CODE_ENDPOINT = API_BASE ? `${API_BASE}/api/signup/send-code` : '/api/signup/index.php';
const FINALIZE_ENDPOINT = API_BASE ? `${API_BASE}/api/signup` : '/api/signup/index.php';
const REQUESTS_ENDPOINT = API_BASE ? `${API_BASE}/api/signup/requests` : '/api/signup/requests.php';

export type SignupErrorKey =
  | 'signup.errors.badRequest'
  | 'signup.errors.unauthorized'
  | 'signup.errors.forbidden'
  | 'signup.errors.notFound'
  | 'signup.errors.conflict'
  | 'signup.errors.validation'
  | 'signup.errors.rateLimited'
  | 'signup.errors.server'
  | 'signup.errors.generic'
  | 'signup.errors.network'
  | 'signup.errors.sessionRequired'
  | 'signup.errors.unexpectedResponse';

export class SignupError extends Error {
  public status?: number;
  public translationKey: SignupErrorKey;
  public details?: Record<string, unknown>;

  constructor(
    translationKey: SignupErrorKey,
    options: { status?: number; message?: string; details?: Record<string, unknown> } = {}
  ) {
    super(options.message ?? translationKey);
    this.name = 'SignupError';
    this.translationKey = translationKey;
    this.status = options.status;
    this.details = options.details;
  }
}

const STATUS_ERROR_MAP: Record<number, SignupErrorKey> = {
  400: 'signup.errors.badRequest',
  401: 'signup.errors.unauthorized',
  403: 'signup.errors.forbidden',
  404: 'signup.errors.notFound',
  409: 'signup.errors.conflict',
  422: 'signup.errors.validation',
  429: 'signup.errors.rateLimited',
  500: 'signup.errors.server',
  502: 'signup.errors.server',
  503: 'signup.errors.server',
  504: 'signup.errors.server',
};

function resolveErrorKey(status?: number, data?: any): SignupErrorKey {
  if (data && typeof data.errorKey === 'string') {
    return data.errorKey as SignupErrorKey;
  }
  if (typeof status === 'number' && STATUS_ERROR_MAP[status]) {
    return STATUS_ERROR_MAP[status];
  }
  if (typeof status === 'number' && status >= 500) {
    return 'signup.errors.server';
  }
  return 'signup.errors.generic';
}

/**
 * Ortak response yardımcısı: JSON parse eder, hata varsa `SignupError` fırlatır.
 */
async function handleResponse(response: Response): Promise<any> {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || (data && data.ok === false)) {
    const translationKey = resolveErrorKey(response.status, data);
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      (data && typeof data.message === 'string' && data.message) ||
      translationKey;
    const details = data && typeof data.details === 'object' ? data.details : undefined;
    throw new SignupError(translationKey, { status: response.status, message, details });
  }

  return data;
}

function ensureAdminToken(token?: string): string {
  if (!token) {
    throw new SignupError('signup.errors.sessionRequired', { status: 401 });
  }
  return token;
}

/**
 * Kullanıcının girdiği form bilgileriyle doğrulama kodu ister.
 */
export async function requestSignupCode(payload: SignupCodePayload): Promise<void> {
  try {
    const response = await fetch(SEND_CODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, mode: 'send-code' }),
    });

    await handleResponse(response);
  } catch (error) {
    if (error instanceof SignupError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : undefined;
    throw new SignupError('signup.errors.network', { message });
  }
}

/**
 * Kullanıcının kodunu doğrular ve backend'in döndürdüğü kayıt talebini geri verir.
 */
export async function finalizeSignup(email: string, code: string): Promise<SignupFinalizePayload> {
  try {
    const response = await fetch(FINALIZE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, mode: 'finalize' }),
    });

    const data = await handleResponse(response);
    if (!data || !data.payload) {
      throw new SignupError('signup.errors.unexpectedResponse', { status: response.status });
    }

    return data.payload as SignupFinalizePayload;
  } catch (error) {
    if (error instanceof SignupError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : undefined;
    throw new SignupError('signup.errors.network', { message });
  }
}

/** Dev ortamında admin paneli için mevcut talepleri listeler. */
export async function fetchSignupRequests(token?: string): Promise<SignupFinalizePayload[]> {
  const authToken = ensureAdminToken(token);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  try {
    const response = await fetch(REQUESTS_ENDPOINT, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await handleResponse(response);
    return Array.isArray(data?.requests) ? (data.requests as SignupFinalizePayload[]) : [];
  } catch (error) {
    if (error instanceof SignupError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : undefined;
    throw new SignupError('signup.errors.network', { message });
  }
}

/** Dev ortamında onay/red sonrası hafızadaki talebi temizler. */
export async function resolveSignupRequest(id: string, token?: string): Promise<void> {
  const authToken = ensureAdminToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  try {
    const response = await fetch(REQUESTS_ENDPOINT, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ id }),
    });

    await handleResponse(response);
  } catch (error) {
    if (error instanceof SignupError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : undefined;
    throw new SignupError('signup.errors.network', { message });
  }
}
