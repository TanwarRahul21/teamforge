import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface", className)}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Project progress"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
