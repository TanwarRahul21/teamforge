import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { ActivityItem } from "@/types/dashboard";

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        <span className="text-xs text-muted">Updated 1h ago</span>
      </div>

      <ul className="space-y-3">
        {activities.map((activity) => (
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
        ))}
      </ul>
    </Card>
  );
}
