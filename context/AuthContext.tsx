import * as React from 'react';
import { UserRole } from '../types';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const LOGIN_ENDPOINT = API_BASE ? `${API_BASE}/api/auth/login` : '/api/auth/login/index.php';
const LOGOUT_ENDPOINT = API_BASE ? `${API_BASE}/api/auth/logout` : '/api/auth/logout/index.php';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);

  const login = React.useCallback(async (email: string, password: string) => {
    // Mock Login for Demo & Local Dev
    if ((email === 'demo@dripfy.com' && password === '123456') ||
      (email === 'dripfy@hasiripi.com' && password === 'fykciw-9busgI-nosgem')) {
      const mockUser: AuthUser = {
        id: email === 'demo@dripfy.com' ? '1' : '2',
        email: email,
        name: email === 'demo@dripfy.com' ? 'Demo User' : 'Dripfy Admin',
        role: 'admin',
        lastLogin: new Date().toISOString()
      };
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay
      setUser(mockUser);
      setToken('mock-token');
      return mockUser;
    }

    const response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      const errorCode = response.status === 401 ? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED';
      const message = typeof data?.error === 'string' ? data.error : 'Login failed';
      const error = new Error(message) as Error & { code?: string };
      error.code = errorCode;
      throw error;
    }

    const payload = data.user as AuthUser;
    setUser(payload);
    setToken(typeof data.token === 'string' ? data.token : null);
    return payload;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch(LOGOUT_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      setToken(null);
      localStorage.setItem('dripfy-logged-out', 'true');
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    logout,
  }), [user, token, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
