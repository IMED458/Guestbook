import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../domain/models.ts';
import type { Permission } from '../domain/roles.ts';
import { hasAnyPermission, hasPermission, isBackOffice } from '../domain/roles.ts';
import { currentProfile, signInWithUsername, signOutCurrentUser } from '../services/authService.ts';

/**
 * Who is using the app right now, and what they may see.
 *
 * The answers here shape navigation only. The same questions are asked again
 * by firestore.rules and by the Worker, because a hidden menu item has never
 * stopped anybody.
 */

interface SessionValue {
  user: AppUser | null;
  loading: boolean;
  /** True once the initial profile load has settled, signed in or not. */
  ready: boolean;
  signIn: (username: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClient: boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUser(await currentProfile());
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const profile = await signInWithUsername(username, password);
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      ready,
      signIn,
      signOut,
      refresh,
      can: (permission) => hasPermission(user?.role, user?.permissions, permission),
      canAny: (permissions) => hasAnyPermission(user?.role, user?.permissions, permissions),
      isAdmin: isBackOffice(user?.role),
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
      isClient: user?.role === 'CLIENT',
    }),
    [user, loading, ready, signIn, signOut, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider');
  }
  return context;
}
