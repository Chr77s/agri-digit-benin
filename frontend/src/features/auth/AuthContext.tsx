import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshAccess, setAccessToken, setOnAuthLost } from '../../shared/api/client';
import type { User } from '../../shared/api/types';
import i18n from '../../i18n';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (access: string, user: User) => void;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  const signIn = useCallback((access: string, u: User) => {
    setAccessToken(access);
    setUser(u);
    void i18n.changeLanguage(u.language || 'fr');
  }, []);

  const signOut = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* déjà déconnecté */ }
    setAccessToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setOnAuthLost(() => setUser(null));
    // Rechargement de page : le jeton d'accès est en mémoire, on le récupère via le cookie de rafraîchissement.
    refreshAccess()
      .then(async (ok) => {
        if (ok) {
          const u = await api<User>('/auth/me');
          setUser(u);
          void i18n.changeLanguage(u.language || 'fr');
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  return <Ctx.Provider value={{ user, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth hors AuthProvider');
  return c;
}
