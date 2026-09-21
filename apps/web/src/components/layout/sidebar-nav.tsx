"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconOverview, IconProjects, IconTasks, IconTeams, IconSettings } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { navItems, secondaryNavItems } from "@/lib/navigation";

const iconMap = {
  overview: IconOverview,
  projects: IconProjects,
  tasks: IconTasks,
  teams: IconTeams,
  settings: IconSettings,
};

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  const renderItems = (items: typeof navItems) =>
    items.map((item) => {
      const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
      const Icon = iconMap[item.icon];

      return (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-surface text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
              compact && "justify-center px-2.5",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", compact ? "h-5 w-5" : "h-4 w-4")} />
            {!compact && <span>{item.label}</span>}
          </Link>
        </li>
      );
    });

  return (
    <nav aria-label="Primary" className="flex flex-col gap-2">
      <ul className="space-y-1.5">{renderItems(navItems)}</ul>
      <div className="mt-4 border-t border-border pt-4">
        <ul className="space-y-1.5">{renderItems(secondaryNavItems)}</ul>
      </div>
    </nav>
  );
}
