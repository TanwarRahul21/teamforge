import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "accent" | "on-track" | "at-risk" | "blocked";
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  const toneClasses = {
    neutral: "border-border bg-surface-alt text-muted",
    accent: "border-accent/25 bg-accent-soft text-accent",
    "on-track": "border-border bg-done text-done-text",
    "at-risk": "border-border bg-risk text-risk-text",
    blocked: "border-border bg-blocked text-blocked-text",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium leading-none",
        toneClasses[tone],
        className,
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {children}
    </span>
  );
}
