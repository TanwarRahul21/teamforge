import type { ReactNode } from "react";

import { DashboardDataProvider } from "@/components/dashboard/dashboard-data-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}
