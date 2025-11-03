"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { slugify } from "@/lib/slugify";
import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateJobs, deleteJob as deleteJobFromFirestore } from "@/server/data/jobStore";
import type { JobRole } from "@/types/content";

const jobFormSchema = z.object({
  originalId: z.string().optional(),
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  link: z.string().optional(),
});

export type JobFormState = {
  message?: string;
  errors?: Record<string, string>;
};

class ConflictError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
  }
}

class NotFoundError extends Error {}

function normalizeLink(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.length) return undefined;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    throw new Error("Link must be a valid URL or start with / or #");
  }
}


export async function upsertJob(prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const parsed = jobFormSchema.safeParse({
    originalId: formData.get("originalId")?.toString(),
    id: formData.get("id")?.toString(),
    title: formData.get("title")?.toString(),
    location: formData.get("location")?.toString(),
    type: formData.get("type")?.toString(),
    description: formData.get("description")?.toString(),
    link: formData.get("link")?.toString(),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      if (typeof i.path[0] === "string") errors[i.path[0]] = i.message;
    });
    return { errors };
  }

  const data = parsed.data;

  let link: string | undefined;
  try {
    link = normalizeLink(data.link);
  } catch (error) {
    return { errors: { link: error instanceof Error ? error.message : "Invalid link" } };
  }

  const normalizedId =
    data.id?.trim().length ? slugify(data.id) : slugify(data.title);

  const nextJob: JobRole = {
    id: normalizedId,
    title: data.title,
    location: data.location,
    type: data.type,
    description: data.description,
    link,
  };

  let result: { action: "create" | "update"; before?: JobRole; after: JobRole };
  try {
    result = await updateJobs((jobs) => {
      const targetId = data.originalId?.trim().length ? data.originalId : normalizedId;
      const existingIndex = jobs.findIndex((j) => j.id === targetId);
      const duplicate = jobs.some((j, i) => j.id === normalizedId && i !== existingIndex);
      if (duplicate) throw new ConflictError("id", "Another role already uses this ID");

      const nextJobs = [...jobs];
      const action: "create" | "update" = existingIndex === -1 ? "create" : "update";
      const before = existingIndex === -1 ? undefined : jobs[existingIndex];

      if (existingIndex === -1) {
        nextJobs.unshift(nextJob);
      } else {
        nextJobs[existingIndex] = nextJob;
      }

      return { data: nextJobs, result: { action, before, after: nextJob } };
    });
  } catch (err) {
    if (err instanceof ConflictError) return { errors: { [err.field]: err.message } };
    throw err;
  }

  await appendAuditEntry({
    resource: "careers",
    action: result.action,
    userId,
    before: result.before,
    after: result.after,
  });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath("/");

  redirect(`/admin/careers?updated=${encodeURIComponent(nextJob.id)}`);
}


const deleteSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export async function deleteJob(prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const submission = deleteSchema.safeParse({
    id: formData.get("id")?.toString(),
  });
  if (!submission.success) return { message: "Invalid request" };

  const jobId = submission.data.id;
  let removed: JobRole | null = null;

  try {
    await deleteJobFromFirestore(jobId);
    removed = { id: jobId } as JobRole;
  } catch (err) {
    console.error("❌ Firestore deletion failed:", err);
    return { message: "Failed to delete job" };
  }

  await appendAuditEntry({
    resource: "careers",
    action: "delete",
    userId,
    before: removed,
    after: null,
  });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath("/");

  redirect(`/admin/careers?deleted=${encodeURIComponent(jobId)}`);
}
