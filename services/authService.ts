/**
 * Base URL for backend calls. In production the PHP endpoints are served
 * directly; during development Express proxies requests under `VITE_API_BASE`.
 */
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

const PASSWORD_REQUEST_ENDPOINT = API_BASE
  ? `${API_BASE}/api/auth/password/request`
  : '/api/auth/password/request.php';
const PASSWORD_RESET_ENDPOINT = API_BASE
  ? `${API_BASE}/api/auth/password/reset`
  : '/api/auth/password/reset.php';

export type PasswordResetStage = 'request' | 'verify';

export class AuthError extends Error {
  public status?: number;
  public translationKey?: string;

  constructor(message: string, options: { status?: number; translationKey?: string } = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = options.status;
    this.translationKey = options.translationKey;
  }
}

async function handleResponse(response: Response, fallbackKey: string) {
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || (data && data.ok === false)) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      (data && typeof data.message === 'string' && data.message) ||
      fallbackKey;
    const translationKey =
      (data && typeof data.errorKey === 'string' && data.errorKey) || fallbackKey;
    throw new AuthError(message, { status: response.status, translationKey });
  }

  return data;
}

/**
 * Triggers the backend to create a password reset code and send the e-mail.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(PASSWORD_REQUEST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  await handleResponse(response, 'passwordReset.errors.requestFailed');
}

/**
 * Submits the verification code alongside the new password to complete the
 * reset flow.
 */
export async function resetPassword(options: {
  email: string;
  code: string;
  password: string;
}): Promise<void> {
  const response = await fetch(PASSWORD_RESET_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: options.email,
      code: options.code,
      password: options.password,
    }),
  });

  await handleResponse(response, 'passwordReset.errors.resetFailed');
}
