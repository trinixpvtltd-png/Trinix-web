import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "./core";

function sessionRoles(session: Session | null | undefined) {
  const direct = Array.isArray((session as Session & { roles?: unknown })?.roles)
    ? ((session as Session & { roles?: unknown }).roles as string[])
    : [];
  const userRoles = Array.isArray(session?.user && (session.user as { roles?: unknown })?.roles)
    ? ((session?.user as { roles?: string[] }).roles ?? [])
    : [];
  return Array.from(new Set([...direct, ...userRoles].filter((role) => typeof role === "string"))) as string[];
}

export async function requireAuth(redirectTo = "/admin/login") {
  const session = await auth();
  if (!session) {
    redirect(redirectTo);
  }
  return session;
}

export function assertRole(session: Session | null | undefined, allowed: string[] = ["admin"], redirectTo = "/admin/login?error=unauthorized") {
  const roles = sessionRoles(session);
  if (!roles.some((role) => allowed.includes(role))) {
    redirect(redirectTo);
  }
}

export async function getAdminSession(): Promise<Session | null> {
  const session = await auth();
  if (!session) {
    return null;
  }
  const roles = sessionRoles(session);
  if (!roles.includes("admin")) {
    return null;
  }
  return session;
}
