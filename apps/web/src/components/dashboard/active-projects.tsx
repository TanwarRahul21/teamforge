import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatShortDate } from "@/lib/format";
import type { Project } from "@/types/dashboard";

const healthToneMap: Record<Project["health"], "on-track" | "at-risk" | "blocked"> = {
  "On track": "on-track",
  "At risk": "at-risk",
  Blocked: "blocked",
};

export function ActiveProjects({ projects }: { projects: Project[] }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Active projects</h2>
        <span className="text-xs text-muted">{projects.length} tracked</span>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="rounded-lg border border-border bg-surface-alt p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">{project.name}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{project.key}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={healthToneMap[project.health]}>{project.health}</Badge>
                  <span className="text-xs text-muted">{project.openTasks} open tasks</span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start">
                {project.members.map((member) => (
                  <Avatar key={member} initials={member} size="sm" className="border-none" />
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span>{project.lead}</span>
                <span>{project.progress}%</span>
              </div>
              <ProgressBar value={project.progress} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
              <span>Due {formatShortDate(project.dueDate, "en-US", "UTC")}</span>
              <span className="font-medium text-foreground">Lead: {project.lead}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
