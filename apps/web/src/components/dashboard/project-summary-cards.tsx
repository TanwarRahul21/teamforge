import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/dashboard";

const summaryConfig = [
  { key: "activeProjects", label: "Active projects", tone: "accent" },
  { key: "atRisk", label: "At risk", tone: "warning" },
  { key: "openTasks", label: "Open tasks", tone: "neutral" },
  { key: "dueThisWeek", label: "Due this week", tone: "success" },
] as const;

export function ProjectSummaryCards({ summary }: { summary: DashboardSummary }) {
  if (summary.state === "unavailable") {
    return (
      <Card className="border-dashed p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Overview unavailable</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">Project summary is not supported yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{summary.message}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryConfig.map(({ key, label }) => (
        <Card key={key} className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-foreground">
            {summary[key]}
          </p>
          <p className="mt-3 text-xs text-muted">
            {key === "activeProjects" && "Across engineering and product squads"}
            {key === "atRisk" && "Health checks need attention"}
            {key === "openTasks" && "Assigned and awaiting pickup"}
            {key === "dueThisWeek" && "Milestones and review items"}
          </p>
        </Card>
      ))}
    </div>
  );
}
