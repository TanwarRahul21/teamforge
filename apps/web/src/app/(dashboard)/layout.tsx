import type { ReactNode } from "react";

import { DashboardLayoutGate } from "@/components/auth/dashboard-layout-gate";
import { getDashboardData } from "@/lib/mock/dashboard";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const data = await getDashboardData();

  return <DashboardLayoutGate data={data}>{children}</DashboardLayoutGate>;
}
