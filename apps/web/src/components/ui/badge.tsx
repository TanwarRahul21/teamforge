import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "accent" | "on-track" | "at-risk" | "blocked";
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  const toneClasses = {
    neutral: "bg-surface text-muted border-border",
    accent: "bg-accent-soft text-accent border-accent/20",
    "on-track": "bg-done/80 text-emerald-700 border-emerald-200",
    "at-risk": "bg-review/80 text-amber-700 border-amber-200",
    blocked: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
