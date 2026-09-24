"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/auth/auth-provider";
import type { DashboardData } from "@/types/dashboard";

function DashboardLoadingState() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 text-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-alt px-4 py-3 shadow-sm">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">Checking your TeamForge session…</span>
      </div>
    </div>
  );
}

type DashboardLayoutGateProps = {
  data: DashboardData;
  children: ReactNode;
};

export function DashboardLayoutGate({ data, children }: DashboardLayoutGateProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <DashboardLoadingState />;
  }

  return <AppShell data={data}>{children}</AppShell>;
}