import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getDashboardData } from "@/lib/mock/dashboard";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const data = await getDashboardData();

  return <AppShell data={data}>{children}</AppShell>;
}
