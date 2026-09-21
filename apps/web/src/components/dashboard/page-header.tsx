type PageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
};

export function PageHeader({ title, subtitle, actionLabel = "New item" }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-muted">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <p className="max-w-md text-sm text-muted">{subtitle}</p>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
