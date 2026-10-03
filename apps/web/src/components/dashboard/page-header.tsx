type PageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
};

export function PageHeader({ title, subtitle, actionLabel = "New item" }: PageHeaderProps) {
  return (
    <div className="mb-6 border-b border-border pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Dashboard</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="max-w-xl text-sm leading-6 text-muted">{subtitle}</p>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:opacity-95"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
