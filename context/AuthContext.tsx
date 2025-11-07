import * as React from 'react';
import { ChatbotAction, ChatbotActionPermissionMap, UserRole, isRoleAtLeast } from '../types';
import chatbotActionPermissions from '../config/chatbot-actions.json';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
  capabilities?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isExternalStakeholder: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  canUseChatbotAction: (action: ChatbotAction) => boolean;
  allowedChatbotActions: ChatbotAction[];
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
  const permissions = React.useRef<ChatbotActionPermissionMap>(chatbotActionPermissions);

  const login = React.useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    
    console.log('[AuthContext] Attempting login to:', LOGIN_ENDPOINT);
    console.log('[AuthContext] API_BASE:', API_BASE);
    console.log('[AuthContext] Email (original):', JSON.stringify(email));
    console.log('[AuthContext] Email (trimmed):', JSON.stringify(trimmedEmail));
    console.log('[AuthContext] Password length:', password.length);
    console.log('[AuthContext] Password (trimmed) length:', trimmedPassword.length);
    
    try {
      const requestBody = { email: trimmedEmail, password: trimmedPassword };
      console.log('[AuthContext] Request body:', JSON.stringify(requestBody));
      
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('[AuthContext] Response status:', response.status);
      const data = await response.json().catch((err) => {
        console.error('[AuthContext] Failed to parse response:', err);
        return null;
      });
      console.log('[AuthContext] Response data:', data);

      if (!response.ok || !data?.ok) {
        const errorCode = response.status === 401 ? 'INVALID_CREDENTIALS' : 'LOGIN_FAILED';
        const message = typeof data?.error === 'string' ? data.error : 'Login failed';
        console.error('[AuthContext] Login failed:', { errorCode, message, status: response.status });
        const error = new Error(message) as Error & { code?: string };
        error.code = errorCode;
        throw error;
      }

      const payload = data.user as AuthUser;
      setUser(payload);
      setToken(typeof data.token === 'string' ? data.token : null);
      console.log('[AuthContext] Login successful:', payload.email);
      return payload;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
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
    }
  }, []);

  const canUseChatbotAction = React.useCallback((action: ChatbotAction) => {
    const allowedRoles = permissions.current[action] || [];
    if (!allowedRoles.length) {
      return false;
    }
    if (!user) {
      return false;
    }
    return allowedRoles.includes(user.role);
  }, [user]);

  const allowedChatbotActions = React.useMemo<ChatbotAction[]>(() => {
    if (!user) {
      return [];
    }
    return (Object.keys(permissions.current) as ChatbotAction[]).filter((action) =>
      canUseChatbotAction(action),
    );
  }, [user, canUseChatbotAction]);

  const value = React.useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user),
    isAdmin: isRoleAtLeast(user?.role ?? null, 'admin'),
    isExternalStakeholder: user?.role === 'external-stakeholder',
    login,
    logout,
    canUseChatbotAction,
    allowedChatbotActions,
  }), [user, token, login, logout, canUseChatbotAction, allowedChatbotActions]);

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
