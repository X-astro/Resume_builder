'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  authApi,
  usersApi,
  getUserToken,
  setUserToken,
  removeUserToken,
} from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  getMultipleProfileIds: () => Promise<string[]>;
  setMultipleProfileIds: (ids: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUserToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await authApi.register({ email, password, name });
    setUserToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    removeUserToken();
    setUser(null);
  }, []);

  const getMultipleProfileIds = useCallback(async (): Promise<string[]> => {
    const token = getUserToken();
    if (!token) return [];
    try {
      const res = await usersApi.getMultipleProfiles();
      return res.profileIds ?? [];
    } catch {
      return [];
    }
  }, []);

  const setMultipleProfileIds = useCallback(async (ids: string[]) => {
    const token = getUserToken();
    if (!token) return;
    await usersApi.updateMultipleProfiles(ids);
  }, []);

  useEffect(() => {
    const token = getUserToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    usersApi
      .getMe()
      .then((u) => setUser({ id: u.id, email: u.email, name: u.name }))
      .catch(() => {
        removeUserToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    getMultipleProfileIds,
    setMultipleProfileIds,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
