"use client";

import { ActiveProjects } from "@/components/dashboard/active-projects";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectSummaryCards } from "@/components/dashboard/project-summary-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TaskStats } from "@/components/dashboard/task-stats";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";

export function DashboardPageContent() {
  const data = useDashboardData();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Welcome back, ${data.user.firstName}`}
        subtitle="A compact snapshot of delivery health, team momentum, and work progressing through the pipeline."
      />

      <ProjectSummaryCards summary={data.summary} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-6">
          <TaskStats taskStatus={data.taskStatus} />
          <ActiveProjects projects={data.projects} />
        </div>

        <RecentActivity activities={data.activities} />
      </div>
    </div>
  );
}