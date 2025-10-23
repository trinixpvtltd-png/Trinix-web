import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAuth, assertRole } from "@/server/auth/guards";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();
  assertRole(session, ["admin"]);

  return <AdminShell session={session}>{children}</AdminShell>;
}
