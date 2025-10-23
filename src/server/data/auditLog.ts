import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";

import { mutateJsonFile, readJsonFile } from "@/server/data/fileStore";

const AUDIT_PATH = path.join(process.cwd(), "content", "audit-log.json");

export type AuditEntry = {
  id: string;
  resource: string;
  action: "create" | "update" | "delete";
  userId: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
};

export async function appendAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">) {
  const payload: AuditEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  await mutateJsonFile(AUDIT_PATH, auditSchema, async (current) => {
    const next = [payload, ...current];
    return { data: next, result: payload };
  }, AUDIT_FALLBACK);
}

export async function readAuditLog(limit = 100) {
  const log = await readJsonFile(AUDIT_PATH, auditSchema, AUDIT_FALLBACK);
  return log.slice(0, limit);
}

const auditSchema = z.array(
  z.object({
    id: z.string(),
    resource: z.string(),
    action: z.enum(["create", "update", "delete"]),
    userId: z.string(),
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    timestamp: z.string(),
  })
);

const AUDIT_FALLBACK: AuditEntry[] = [];
