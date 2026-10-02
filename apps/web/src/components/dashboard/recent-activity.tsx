import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { ActivityItem } from "@/types/dashboard";

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  if (activities.length === 0) {
    return (
      <Card className="border-dashed p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <p className="mt-3 text-sm leading-6 text-muted">No activity is available yet.</p>
      </Card>
    );
  }

  const firstActivity = activities[0];

  if (firstActivity && "kind" in firstActivity && firstActivity.kind === "unavailable") {
    return (
      <Card className="border-dashed p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <p className="mt-3 text-sm leading-6 text-muted">{firstActivity.message}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <span className="text-xs text-muted">Updated 1h ago</span>
      </div>

      <ul className="space-y-3">
        {activities.map((activity) => {
          if ("kind" in activity && activity.kind === "unavailable") {
            return (
              <li key={activity.title} className="rounded-lg border border-dashed border-border bg-surface-alt p-4">
                <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{activity.message}</p>
              </li>
            );
          }

          return (
            <li key={activity.id} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <Avatar initials={activity.initials} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                  <span className="font-medium text-foreground"> {activity.target}</span>
                </p>
                <time dateTime={activity.time} className="mt-1 block text-xs text-muted">
                  {formatRelativeTime(activity.time, "en-US", "UTC")}
                </time>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
