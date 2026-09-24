"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { ApiError, NetworkError } from "@/lib/api/errors";

function LoginPageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login({
        email,
        password,
      });
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to sign in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-4 text-foreground">
        <Card className="w-full max-w-md p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">TeamForge</p>
              <p className="text-sm text-muted">Checking your session…</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(28,115,232,0.08),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-8 text-foreground sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <section className="flex flex-col justify-center gap-4 rounded-3xl border border-border bg-surface/80 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
            <div className="inline-flex w-fit items-center rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              TeamForge access
            </div>
            <div className="max-w-xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Sign in to the delivery dashboard.
              </h1>
              <p className="text-sm leading-6 text-muted sm:text-base">
                Use your existing TeamForge account to reach projects, tasks, and activity in the same workspace shell.
              </p>
            </div>
            <div className="grid gap-3 pt-2 text-sm text-muted sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface-alt p-4">
                Live API auth
              </div>
              <div className="rounded-2xl border border-border bg-surface-alt p-4">
                In-memory session only
              </div>
              <div className="rounded-2xl border border-border bg-surface-alt p-4">
                Protected dashboard routes
              </div>
            </div>
          </section>

          <Card className="flex flex-col justify-center p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Authentication</p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Log in</h2>
              <p className="text-sm text-muted">Enter your workspace credentials to continue.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                  placeholder="you@teamforge.dev"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                  placeholder="Password"
                />
              </div>

              {errorMessage ? (
                <p
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginPageContent />;
}