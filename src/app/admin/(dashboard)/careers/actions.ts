"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { slugify } from "@/lib/slugify";
import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateJobs } from "@/server/data/jobStore";
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
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    throw new Error("Link must be a valid URL or start with / or #");
  }
}

export async function upsertJob(prevState: JobFormState, formData: FormData): Promise<JobFormState> {
  const session = await getAdminSession();
  if (!session) {
    return { message: "Unauthorized" };
  }
  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  let payload: z.infer<typeof jobFormSchema>;
  try {
    payload = jobFormSchema.parse({
      originalId: formData.get("originalId")?.toString(),
      id: formData.get("id")?.toString(),
      title: formData.get("title")?.toString(),
      location: formData.get("location")?.toString(),
      type: formData.get("type")?.toString(),
      description: formData.get("description")?.toString(),
      link: formData.get("link")?.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") {
          errors[key] = issue.message;
        }
      }
      return { errors };
    }
    return { message: "Invalid submission" };
  }

  let link: string | undefined;
  try {
    link = normalizeLink(payload.link);
  } catch (error) {
    return { errors: { link: error instanceof Error ? error.message : "Invalid link" } };
  }

  const normalizedId = payload.id && payload.id.trim().length ? slugify(payload.id) : slugify(payload.title);
  const nextJob: JobRole = {
    id: normalizedId,
    title: payload.title,
    location: payload.location,
    type: payload.type,
    description: payload.description,
    link,
  };
  let result: { action: "create" | "update"; before?: JobRole; after: JobRole };
  try {
    result = await updateJobs((jobs) => {
      const targetId = payload.originalId?.trim().length ? payload.originalId : normalizedId;
      const existingIndex = jobs.findIndex((job) => job.id === targetId);
      const duplicate = jobs.some((job, index) => job.id === normalizedId && index !== existingIndex);
      if (duplicate) {
        throw new ConflictError("id", "Another role already uses this ID");
      }

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
  } catch (error) {
    if (error instanceof ConflictError) {
      return { errors: { [error.field]: error.message } };
    }
    throw error;
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
  if (!session) {
    return { message: "Unauthorized" };
  }

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const submission = deleteSchema.safeParse({ id: formData.get("id")?.toString() });
  if (!submission.success) {
    return { message: "Invalid request" };
  }

  let removed: JobRole | null = null;
  try {
    removed = await updateJobs((jobs) => {
      const index = jobs.findIndex((job) => job.id === submission.data.id);
      if (index === -1) {
        throw new NotFoundError("Role not found");
      }
      const nextJobs = [...jobs];
      const [deleted] = nextJobs.splice(index, 1);
      return { data: nextJobs, result: deleted };
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { message: error.message };
    }
    throw error;
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

  redirect(`/admin/careers?deleted=${encodeURIComponent(removed!.id)}`);
}
