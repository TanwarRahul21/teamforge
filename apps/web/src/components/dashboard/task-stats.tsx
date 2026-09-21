import { Card } from "@/components/ui/card";
import type { TaskStatusCounts } from "@/types/dashboard";

type TaskStatsProps = {
  taskStatus: TaskStatusCounts;
};

const tasks = [
  { key: "backlog", label: "Backlog", color: "bg-backlog" },
  { key: "inProgress", label: "In progress", color: "bg-in-progress" },
  { key: "review", label: "Review", color: "bg-review" },
  { key: "done", label: "Done", color: "bg-done" },
] as const;

export function TaskStats({ taskStatus }: TaskStatsProps) {
  const entries = tasks.map((task) => ({
    ...task,
    value: taskStatus[task.key],
  }));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0) || 1;

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Task status</h2>
        <span className="text-xs text-muted">{total} total</span>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => {
          const percentage = Math.round((entry.value / total) * 100);

          return (
            <div key={entry.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{entry.label}</span>
                <span className="tabular-nums text-muted">{entry.value} ({percentage}%)</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                <div className={`${entry.color} h-full rounded-full`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
