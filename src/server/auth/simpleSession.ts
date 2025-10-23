import type { Session } from "next-auth";

import { getAdminSession as guardSession } from "@/server/auth/guards";

export type SimpleAdminSession = Session;

export async function getAdminSession(): Promise<SimpleAdminSession | null> {
  return guardSession();
}
