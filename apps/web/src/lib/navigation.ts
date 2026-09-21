export type NavItem = {
  href: string;
  label: string;
  icon: "overview" | "projects" | "tasks" | "teams" | "settings";
};

export const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/teams", label: "Teams", icon: "teams" },
];

export const secondaryNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: "settings" },
];
