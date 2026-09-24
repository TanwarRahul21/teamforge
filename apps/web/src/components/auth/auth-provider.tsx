"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  getSessionSnapshot,
  login as loginSession,
  logout as logoutSession,
  refresh as refreshSession,
  restoreSession,
} from "@/lib/auth/auth-service";
import type { LoginRequest, LoginUser } from "@/types/auth";

type AuthContextValue = {
  user: LoginUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = getSessionSnapshot();
  const [user, setUser] = useState<LoginUser | null>(snapshot?.user ?? null);
  const [isLoading, setIsLoading] = useState(Boolean(snapshot));

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const session = await restoreSession();

        if (!active) {
          return;
        }

        setUser(session?.user ?? null);
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const session = await loginSession(credentials);
    setUser(session.user);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const session = await refreshSession();
    setUser(session?.user ?? null);
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      refresh,
    }),
    [isLoading, login, logout, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}