export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  email: string;
};

export type ProjectHealth = "On track" | "At risk" | "Blocked";

export type Project = {
  id: string;
  name: string;
  key: string;
  health: ProjectHealth;
  progress: number;
  lead: string;
  members: string[];
  openTasks: number;
  dueDate: string;
};

export type TaskStatusCounts = {
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
};

export type ActivityKind = "pr" | "moved" | "deploy" | "joined" | "risk";

export type ActivityItem = {
  id: string;
  user: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  kind: ActivityKind;
};

export type DashboardSummary = {
  activeProjects: number;
  atRisk: number;
  openTasks: number;
  dueThisWeek: number;
};

export type DashboardData = {
  organization: Organization;
  user: CurrentUser;
  summary: DashboardSummary;
  taskStatus: TaskStatusCounts;
  activities: ActivityItem[];
  projects: Project[];
};
