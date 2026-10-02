"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DashboardLayoutGate } from "@/components/auth/dashboard-layout-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { ApiError, NetworkError } from "@/lib/api/errors";
import { getDashboardData } from "@/lib/dashboard";
import type { DashboardData } from "@/types/dashboard";

type DashboardDataContextValue = DashboardData;

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

function DashboardLoadingState() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 text-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-alt px-4 py-3 shadow-sm">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">Loading your TeamForge dashboard…</span>
      </div>
    </div>
  );
}

function DashboardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-alt p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Dashboard unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Unable to load data</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the dashboard.";
}

export function useDashboardData(): DashboardData {
  const context = useContext(DashboardDataContext);

  if (!context) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }

  return context;
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    let active = true;

    const load = async () => {
      setErrorMessage(null);

      try {
        const dashboardData = await getDashboardData();

        if (active) {
          setData(dashboardData);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await logout();
          return;
        }

        if (active) {
          setData(null);
          setErrorMessage(toErrorMessage(error));
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [isAuthenticated, isLoading, reloadToken, logout]);

  const value = useMemo(() => data, [data]);

  if (isLoading || !isAuthenticated || (!data && !errorMessage)) {
    return <DashboardLoadingState />;
  }

  if (errorMessage) {
    return <DashboardErrorState message={errorMessage} onRetry={() => setReloadToken((value) => value + 1)} />;
  }

  if (!value) {
    return <DashboardLoadingState />;
  }

  return (
    <DashboardDataContext.Provider value={value}>
      <DashboardLayoutGate data={value}>{children}</DashboardLayoutGate>
    </DashboardDataContext.Provider>
  );
}