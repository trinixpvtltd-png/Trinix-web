"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { slugify } from "@/lib/slugify";
import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateProjects } from "@/server/data/projectStore";
import type { Project, ProjectCta } from "@/types/content";

const projectFormSchema = z.object({
  originalId: z.string().optional(),
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  summary: z.string().min(1, "Summary is required"),
  status: z.string().min(1, "Status is required"),
  domain: z.string().optional(),
  link: z.string().optional(),
  spotlightNote: z.string().optional(),
  keyFeatures: z.string().optional(),
  ctas: z.string().optional(),
});

export type ProjectFormState = {
  message?: string;
  errors?: Record<string, string>;
};

class ConflictError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
  }
}

class NotFoundError extends Error {}

function parseFeatureList(value?: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return items.length ? items : undefined;
}

function parseCtas(value?: string | null): ProjectCta[] | undefined {
  if (!value) return undefined;
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (!rows.length) {
    return undefined;
  }
  const ctas: ProjectCta[] = [];
  for (const row of rows) {
    const [label, href] = row.split("|").map((part) => part.trim());
    if (!label || !href) {
      throw new Error("CTA rows must use the format 'Label | https://example.com'");
    }
    ctas.push({ label, href });
  }
  return ctas;
}

function normalizeLink(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.length) return undefined;
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    throw new Error("Link must be a valid URL");
  }
}

export async function upsertProject(prevState: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const session = await getAdminSession();
  if (!session) {
    return { message: "Unauthorized" };
  }
  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  let payload: z.infer<typeof projectFormSchema>;
  try {
    payload = projectFormSchema.parse({
      originalId: formData.get("originalId")?.toString(),
      id: formData.get("id")?.toString(),
      name: formData.get("name")?.toString(),
      summary: formData.get("summary")?.toString(),
      status: formData.get("status")?.toString(),
      domain: formData.get("domain")?.toString(),
      link: formData.get("link")?.toString(),
      spotlightNote: formData.get("spotlightNote")?.toString(),
      keyFeatures: formData.get("keyFeatures")?.toString(),
      ctas: formData.get("ctas")?.toString(),
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
  let keyFeatures: string[] | undefined;
  let ctas: ProjectCta[] | undefined;

  try {
    link = normalizeLink(payload.link);
  } catch (error) {
    return { errors: { link: error instanceof Error ? error.message : "Invalid link" } };
  }

  try {
    keyFeatures = parseFeatureList(payload.keyFeatures);
  } catch (error) {
    return { errors: { keyFeatures: error instanceof Error ? error.message : "Invalid features" } };
  }

  try {
    ctas = parseCtas(payload.ctas);
  } catch (error) {
    return { errors: { ctas: error instanceof Error ? error.message : "Invalid CTAs" } };
  }

  const normalizedId = (payload.id && payload.id.trim().length ? slugify(payload.id) : slugify(payload.name)) || slugify(payload.name);
  const nextProject: Project = {
    id: normalizedId,
    name: payload.name,
    summary: payload.summary,
    status: payload.status,
    domain: payload.domain?.trim() ? payload.domain.trim() : undefined,
    link,
    spotlightNote: payload.spotlightNote?.trim() ? payload.spotlightNote.trim() : undefined,
    keyFeatures,
    ctas,
  };
  let result: { action: "create" | "update"; before?: Project; after: Project };
  try {
    result = await updateProjects((projects) => {
      const targetId = payload.originalId?.trim().length ? payload.originalId : normalizedId;
      const existingIndex = projects.findIndex((project) => project.id === targetId);
      const duplicate = projects.some((project, index) => project.id === normalizedId && index !== existingIndex);
      if (duplicate) {
        throw new ConflictError("id", "Another project already uses this ID");
      }

      const nextProjects = [...projects];
      const action: "create" | "update" = existingIndex === -1 ? "create" : "update";
      const before = existingIndex === -1 ? undefined : projects[existingIndex];

      if (existingIndex === -1) {
        nextProjects.unshift(nextProject);
      } else {
        nextProjects[existingIndex] = nextProject;
      }

      return { data: nextProjects, result: { action, before, after: nextProject } };
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return { errors: { [error.field]: error.message } };
    }
    throw error;
  }

  await appendAuditEntry({
    resource: "projects",
    action: result.action,
    userId,
    before: result.before,
    after: result.after,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");

  redirect(`/admin/projects?updated=${encodeURIComponent(nextProject.id)}`);
}

const deleteSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export async function deleteProject(prevState: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
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

  let removed: Project | null = null;
  try {
    removed = await updateProjects((projects) => {
      const index = projects.findIndex((project) => project.id === submission.data.id);
      if (index === -1) {
        throw new NotFoundError("Project not found");
      }
      const nextProjects = [...projects];
      const [deleted] = nextProjects.splice(index, 1);
      return { data: nextProjects, result: deleted };
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { message: error.message };
    }
    throw error;
  }

  await appendAuditEntry({
    resource: "projects",
    action: "delete",
    userId,
    before: removed,
    after: null,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");

  redirect(`/admin/projects?deleted=${encodeURIComponent(removed!.id)}`);
}
