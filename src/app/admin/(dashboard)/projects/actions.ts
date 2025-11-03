"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { slugify } from "@/lib/slugify";
import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateProjects } from "@/server/data/projectStore";
import { adminDb } from "@/server/firebase/admin";
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
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseCtas(value?: string | null): ProjectCta[] | undefined {
  if (!value) return undefined;
  const rows = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) return undefined;

  const ctas: ProjectCta[] = [];
  for (const row of rows) {
    const [label, href] = row.split("|").map((p) => p.trim());
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
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error("Link must be a valid URL");
  }
}


export async function upsertProject(
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  
  const parsed = projectFormSchema.safeParse({
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

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      if (typeof i.path[0] === "string") errors[i.path[0]] = i.message;
    });
    return { errors };
  }

  const data = parsed.data;

  
  let link: string | undefined;
  let keyFeatures: string[] | undefined;
  let ctas: ProjectCta[] | undefined;

  try {
    link = normalizeLink(data.link);
    keyFeatures = parseFeatureList(data.keyFeatures);
    ctas = parseCtas(data.ctas);
  } catch (err) {
    return { message: (err as Error).message };
  }

  const normalizedId =
    data.id?.trim().length ? slugify(data.id) : slugify(data.name);

  const nextProject: Project = {
    id: normalizedId,
    name: data.name,
    summary: data.summary,
    status: data.status,
    domain: data.domain?.trim() || undefined,
    link,
    spotlightNote: data.spotlightNote?.trim() || undefined,
    keyFeatures,
    ctas,
  };

  let result: { action: "create" | "update"; before?: Project; after: Project };
  try {
    result = await updateProjects((projects) => {
      const targetId =
        data.originalId?.trim().length ? data.originalId : normalizedId;

      const existingIndex = projects.findIndex((p) => p.id === targetId);
      const duplicate = projects.some(
        (p, i) => p.id === normalizedId && i !== existingIndex
      );
      if (duplicate)
        throw new ConflictError("id", "Another project already uses this ID");

      const nextProjects = [...projects];
      const action: "create" | "update" =
        existingIndex === -1 ? "create" : "update";
      const before = existingIndex === -1 ? undefined : projects[existingIndex];

      if (existingIndex === -1) {
        nextProjects.unshift(nextProject);
      } else {
        nextProjects[existingIndex] = nextProject;
      }

      return {
        data: nextProjects,
        result: { action, before, after: nextProject },
      };
    });
  } catch (err) {
    if (err instanceof ConflictError)
      return { errors: { [err.field]: err.message } };
    throw err;
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

export async function deleteProject(
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
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

  const projectId = submission.data.id;

  try {
    const docRef = adminDb.collection("projects").doc(projectId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundError("Project not found");
    }

    const deletedData = snapshot.data() as Project;
    await docRef.delete();

    await appendAuditEntry({
      resource: "projects",
      action: "delete",
      userId,
      before: deletedData,
      after: null,
    });
  } catch (err) {
    if (err instanceof NotFoundError) return { message: err.message };
    console.error("Failed to delete project:", err);
    throw err;
  }

  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");

  redirect(`/admin/projects?deleted=${encodeURIComponent(projectId)}`);
}
