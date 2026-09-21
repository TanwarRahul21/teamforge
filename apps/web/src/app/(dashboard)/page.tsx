import { ActiveProjects } from "@/components/dashboard/active-projects";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectSummaryCards } from "@/components/dashboard/project-summary-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TaskStats } from "@/components/dashboard/task-stats";
import { getDashboardData } from "@/lib/mock/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Welcome back, ${data.user.firstName}`}
        subtitle="Here’s a snapshot of delivery health, team momentum, and work moving through the pipeline."
      />

      <ProjectSummaryCards summary={data.summary} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-6">
          <TaskStats taskStatus={data.taskStatus} />
          <ActiveProjects projects={data.projects} />
        </div>

        <RecentActivity activities={data.activities} />
      </div>
    </div>
  );
}
