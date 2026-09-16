import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, clearTokens, getAccessToken, setTokens, unwrap, type AuthTokens } from './api';

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'superadmin';
  is_active: boolean;
};

type AuthContextValue = {
  user: AdminUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      setReady(true);
      return;
    }
    api
      .get('/users/me')
      .then((res) => {
        const me = unwrap<AdminUser>(res.data);
        if (me.role !== 'superadmin') {
          clearTokens();
          setUser(null);
        } else {
          setUser(me);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const tokens = res.data.token as AuthTokens | undefined;
        const me = unwrap<AdminUser>(res.data);
        if (!tokens?.access?.token) throw new Error('Missing auth token');
        if (me.role !== 'superadmin') {
          clearTokens();
          const err = new Error('NOT_SUPERADMIN');
          throw err;
        }
        setTokens(tokens);
        setUser(me);
      },
      logout: async () => {
        try {
          await api.post('/auth/logout', {});
        } finally {
          clearTokens();
          setUser(null);
        }
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
