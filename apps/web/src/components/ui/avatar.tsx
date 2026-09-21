import { cn } from "@/lib/cn";

type AvatarProps = {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ initials, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-border bg-accent-soft font-medium text-accent",
        sizeClasses[size],
        className,
      )}
      aria-label={initials}
      title={initials}
    >
      {initials}
    </div>
  );
}
