"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { IconBell, IconChevronLeft, IconMenu, IconSearch } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DashboardData } from "@/types/dashboard";

export function AppShell({ data, children }: { data: DashboardData; children: ReactNode }) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountName = user?.display_name ?? "Account";
  const accountEmail = user?.email ?? "";

  const initials = (() => {
    if (!user) {
      return "TF";
    }

    const source = accountName.trim() || accountEmail.trim() || "TF";
    const parts = source.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return "TF";
    }

    if (parts.length === 1) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  })();

  useEffect(() => {
    if (!mobileOpen) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous) previous.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      setMobileOpen(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, mobileOpen]);

  const closeMobileMenu = () => setMobileOpen(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-dvh max-w-[1800px]">
        <aside className="hidden border-r border-border bg-surface lg:block lg:w-[240px] lg:shrink-0">
          <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
                TF
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">TeamForge</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
            <div className="flex h-16 items-center gap-3 px-3 sm:px-4 lg:px-6">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 lg:hidden"
                aria-label="Open navigation menu"
              >
                <IconMenu className="h-5 w-5" />
              </button>

              <div className="flex flex-1 items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-2.5 py-2 text-left text-sm font-medium text-foreground shadow-sm lg:min-w-[180px]"
                >
                  <span className="truncate">{data.organization.name}</span>
                </button>

                <div className="hidden items-center gap-3 md:flex md:flex-1 md:justify-end">
                  <button
                    type="button"
                    className="inline-flex w-full max-w-[420px] items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-left text-sm text-muted shadow-sm"
                    aria-label="Search"
                  >
                    <span className="inline-flex items-center gap-2">
                      <IconSearch className="h-4 w-4" />
                      <span>Search</span>
                    </span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-subtle">⌘K</span>
                  </button>

                  <button
                    type="button"
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-alt text-muted transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    aria-label="Notifications. 3 unread."
                  >
                    <IconBell className="h-4 w-4" />
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
                  </button>

                  <div
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-alt px-2 py-1.5"
                    aria-label={user ? `${accountName} account details` : "Account details"}
                    title={accountEmail}
                  >
                    <Avatar initials={initials} size="sm" className="border-none" />
                    <div className="hidden min-w-0 flex-col items-start lg:flex">
                      <span className="max-w-[180px] truncate text-sm font-medium text-foreground">{accountName}</span>
                      {accountEmail ? (
                        <span className="max-w-[180px] truncate text-xs text-muted">{accountEmail}</span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface-alt px-3 text-sm font-medium text-muted transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    Sign out
                  </button>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-alt text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    aria-label="Search"
                  >
                    <IconSearch className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-alt text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    aria-label="Notifications. 3 unread."
                  >
                    <IconBell className="h-4 w-4" />
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileMenu}
        aria-hidden={!mobileOpen}
      />

      <aside
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-surface shadow-lg transition-transform duration-200 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
              TF
            </div>
            <div className="text-sm font-semibold text-foreground">TeamForge</div>
          </div>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            aria-label="Close navigation menu"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-4">
          <SidebarNav compact />
        </div>
      </aside>
    </div>
  );
}
