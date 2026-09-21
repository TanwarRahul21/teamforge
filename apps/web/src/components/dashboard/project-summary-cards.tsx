import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/dashboard";

const summaryConfig = [
  { key: "activeProjects", label: "Active projects", tone: "accent" },
  { key: "atRisk", label: "At risk", tone: "warning" },
  { key: "openTasks", label: "Open tasks", tone: "neutral" },
  { key: "dueThisWeek", label: "Due this week", tone: "success" },
] as const;

export function ProjectSummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryConfig.map(({ key, label, tone }) => (
        <Card key={key} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">{summary[key]}</p>
            </div>
            <span
              className={[
                "inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold",
                tone === "accent" && "bg-accent-soft text-accent",
                tone === "warning" && "bg-review/90 text-amber-700",
                tone === "neutral" && "bg-surface text-foreground",
                tone === "success" && "bg-done/80 text-emerald-700",
              ].join(" ")}
            >
              {key === "activeProjects" ? "14" : key === "atRisk" ? "3" : key === "openTasks" ? "126" : "18"}
            </span>
          </div>
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
