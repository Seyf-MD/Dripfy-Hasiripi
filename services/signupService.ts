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

export class SignupError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'SignupError';
  }
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

  if (response.status === 401 || response.status === 403) {
    const errorMessage =
      (data && typeof data.error === 'string' && data.error) ||
      'Yetkisiz erişim. Lütfen oturum açtığınızdan emin olun.';
    throw new SignupError(errorMessage, response.status);
  }

  if (!response.ok || (data && data.ok === false)) {
    const errorMessage = (data && typeof data.error === 'string' && data.error) || 'Signup failed';
    throw new SignupError(errorMessage, response.status);
  }

  return data;
}

function ensureAdminToken(token?: string): string {
  if (!token) {
    throw new SignupError('Yönetici oturumu gerekli. Lütfen tekrar giriş yapın.', 401);
  }
  return token;
}

/**
 * Kullanıcının girdiği form bilgileriyle doğrulama kodu ister.
 */
export async function requestSignupCode(payload: SignupCodePayload): Promise<void> {
  const response = await fetch(SEND_CODE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...payload, mode: 'send-code' }),
  });

  await handleResponse(response);
}

/**
 * Kullanıcının kodunu doğrular ve backend'in döndürdüğü kayıt talebini geri verir.
 */
export async function finalizeSignup(email: string, code: string): Promise<SignupFinalizePayload> {
  const response = await fetch(FINALIZE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code, mode: 'finalize' }),
  });

  const data = await handleResponse(response);
  if (!data || !data.payload) {
    throw new SignupError('Yanıt işlenemedi', response.status);
  }

  return data.payload as SignupFinalizePayload;
}

/** Dev ortamında admin paneli için mevcut talepleri listeler. */
export async function fetchSignupRequests(token?: string): Promise<SignupFinalizePayload[]> {
  const authToken = ensureAdminToken(token);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const response = await fetch(REQUESTS_ENDPOINT, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  const data = await handleResponse(response);
  return Array.isArray(data?.requests) ? (data.requests as SignupFinalizePayload[]) : [];
}

/** Dev ortamında onay/red sonrası hafızadaki talebi temizler. */
export async function resolveSignupRequest(id: string, token?: string): Promise<void> {
  const authToken = ensureAdminToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const response = await fetch(REQUESTS_ENDPOINT, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ id }),
  });

  await handleResponse(response);
}
