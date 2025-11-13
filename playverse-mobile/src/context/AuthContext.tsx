import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { convexHttp } from '../lib/convexClient';
import { unregisterStoredPushToken } from '../lib/pushNotifications';

export type Profile = {
  _id: string;
  name: string;
  email: string;
  role: 'free' | 'premium' | 'admin';
  createdAt: number;
};

type AuthContextType = {
  profile?: Profile;
  loading: boolean;
  error?: string;
  loginEmail: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setFromProfile: (p: Profile) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const STORAGE_KEY = 'pv.profile';

  // Best-effort persistence using expo-secure-store if available.
  async function persist(p?: Profile) {
    try {
      const SecureStore = require('expo-secure-store');
      if (p) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(p));
      else await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const SecureStore = require('expo-secure-store');
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const loginEmail: AuthContextType['loginEmail'] = async (email, password) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await (convexHttp as any).mutation('auth:authLogin', { email, password });
      if (!res?.ok) {
        setError(res?.error || 'Error de autenticación');
        return false;
      }
      setProfile(res.profile);
      persist(res.profile);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error de red');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register: AuthContextType['register'] = async (name, email, password) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await (convexHttp as any).mutation('auth:createUser', {
        name,
        email,
        password,
        role: 'free',
      });
      if (!res?.ok) {
        setError(res?.error || 'No se pudo registrar');
        return false;
      }
      setProfile(res.profile);
      persist(res.profile);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Error de red');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setProfile(undefined);
    persist(undefined);
    unregisterStoredPushToken().catch(() => {});
  };

  const setFromProfile: AuthContextType['setFromProfile'] = (p) => {
    setProfile(p);
    persist(p);
  };

  const value = useMemo(() => ({ profile, loading, error, loginEmail, register, logout, setFromProfile }), [profile, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
