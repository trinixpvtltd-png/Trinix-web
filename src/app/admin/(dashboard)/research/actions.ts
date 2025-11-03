"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { UTApi } from "uploadthing/server";

import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import {
  upsertResearch,
  deleteResearch,
  getResearch,
} from "@/server/data/researchStore";

const utapi = new UTApi();

export type ResearchFormState = {
  message?: string;
  errors?: Record<string, string>;
};

// ------------------------------------------------------------
// 🔹 Zod Validation Schema
// ------------------------------------------------------------
const baseSchema = z.object({
  collection: z.enum(["published", "preprints", "ongoing"]),
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  authors: z.string().optional(),
  domain: z.string().optional(),
  venue: z.string().optional(),
  doi: z.string().optional(),
  open_access: z.string().optional(),
  server: z.string().optional(),
  identifier: z.string().optional(),
  version_date: z.string().optional(),
  abstract: z.string().optional(),
  pdf: z.string().optional(),
  modal: z.string().optional(),
  milestone_next: z.string().optional(),
  eta: z.string().optional(),
});

// Helper: Parse line-separated lists into arrays
function parseList(value?: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

// ------------------------------------------------------------
// 🔹 UPSERT: Create or update Firestore entry
// ------------------------------------------------------------
export async function upsertResearchEntry(
  prevState: ResearchFormState,
  formData: FormData
): Promise<ResearchFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const collection = formData.get("collection")?.toString() ?? "";
  const id = formData.get("id")?.toString() ?? "";

  // 1️⃣ Fetch existing document first (for replacement logic)
  const existing = await getResearch(collection as any, id);

  // 2️⃣ Upload new file if provided
  const pdfFile = formData.get("pdfFile") as File | null;
  let uploadedPdfUrl: string | undefined;
  let deletedFileKey: string | null = null;

  if (pdfFile && pdfFile.size > 0) {
    try {
      const uploaded = await utapi.uploadFiles([pdfFile]);
      const fileData = uploaded?.[0]?.data;

      if (fileData?.ufsUrl) {
        uploadedPdfUrl = fileData.ufsUrl;

        // 🗑️ Delete old UploadThing file if one existed
        if ((existing as any)?.pdf) {
          const oldKey = (existing as any).pdf.split("/f/")[1];
          if (oldKey) {
            try {
              await utapi.deleteFiles([oldKey]);
              deletedFileKey = oldKey;
              console.log(`🗑️ Deleted old UploadThing PDF: ${oldKey}`);
            } catch (err) {
              console.warn("⚠️ Failed to delete old UploadThing file:", err);
            }
          }
        }
      } else {
        return { message: "Failed to get uploaded file URL." };
      }
    } catch (err) {
      console.error("❌ UploadThing upload failed:", err);
      return { message: "Failed to upload PDF file." };
    }
  }

  // 3️⃣ Validate form submission
  let submission: z.infer<typeof baseSchema>;
  try {
    submission = baseSchema.parse({
      collection,
      id,
      title: formData.get("title")?.toString(),
      authors: formData.get("authors")?.toString(),
      domain: formData.get("domain")?.toString(),
      venue: formData.get("venue")?.toString(),
      doi: formData.get("doi")?.toString(),
      open_access: formData.get("open_access")?.toString(),
      server: formData.get("server")?.toString(),
      identifier: formData.get("identifier")?.toString(),
      version_date: formData.get("version_date")?.toString(),
      abstract: formData.get("abstract")?.toString(),
      pdf: uploadedPdfUrl ?? formData.get("pdf")?.toString(),
      modal: formData.get("modal")?.toString(),
      milestone_next: formData.get("milestone_next")?.toString(),
      eta: formData.get("eta")?.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errors[key] = issue.message;
      }
      return { errors, message: "Validation failed." };
    }
    return { message: "Invalid submission." };
  }

  // 4️⃣ Prepare Firestore payload
  const authors = parseList(submission.authors);
  const domain = parseList(submission.domain);

  let modal: any;
  if (submission.modal) {
    try {
      modal = JSON.parse(submission.modal);
    } catch {
      return { errors: { modal: "Invalid JSON in modal." } };
    }
  }

  // 5️⃣ Write to Firestore
  try {
    const saved = await upsertResearch(submission.collection, {
      ...submission,
      authors,
      domain,
      open_access:
        submission.open_access === "on" || submission.open_access === "true",
      modal,
    });

    // Log audit (include deleted file key if applicable)
    await appendAuditEntry({
      resource: `research-${submission.collection}`,
      action: existing ? "update" : "create",
      userId,
      before: existing ?? null,
      after: saved,
    });

    revalidatePath("/admin/research");
    revalidatePath("/research");
    revalidatePath("/");

    redirect(
      `/admin/research?updated=${encodeURIComponent(
        `${submission.collection}:${submission.id}`
      )}${deletedFileKey ? `&replaced=${deletedFileKey}` : ""}`
    );
  } catch (error) {
    if ((error as Error).message?.includes("NEXT_REDIRECT")) throw error;

    console.error("Firestore write failed:", error);
    return { message: "Failed to save entry." };
  }
}

// ------------------------------------------------------------
// 🔹 DELETE: Remove Firestore entry + uploaded PDF
// ------------------------------------------------------------
const deleteSchema = z.object({
  collection: z.enum(["published", "preprints", "ongoing"]),
  id: z.string().min(1, "ID is required"),
});

export async function deleteResearchEntry(
  prevState: ResearchFormState,
  formData: FormData
): Promise<ResearchFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const submission = deleteSchema.safeParse({
    collection: formData.get("collection")?.toString(),
    id: formData.get("id")?.toString(),
  });

  if (!submission.success) return { message: "Invalid request." };

  try {
    const existing = await getResearch(
      submission.data.collection,
      submission.data.id
    );

    // 🗑️ Delete PDF from UploadThing if exists
    if ((existing as any)?.pdf) {
      try {
        const fileKey = (existing as any).pdf.split("/f/")[1];
        if (fileKey) {
          await utapi.deleteFiles([fileKey]);
          console.log(`🗑️ Deleted UploadThing PDF (on delete): ${fileKey}`);
        }
      } catch (err) {
        console.warn("⚠️ Failed to delete PDF from UploadThing:", err);
      }
    }

    // Delete from Firestore
    await deleteResearch(submission.data.collection, submission.data.id);

    // Audit log
    await appendAuditEntry({
      resource: `research-${submission.data.collection}`,
      action: "delete",
      userId,
      before: existing,
      after: null,
    });

    revalidatePath("/admin/research");
    revalidatePath("/research");
    revalidatePath("/");

    redirect(
      `/admin/research?deleted=${encodeURIComponent(
        `${submission.data.collection}:${submission.data.id}`
      )}`
    );
  } catch (error) {
    if ((error as Error).message?.includes("NEXT_REDIRECT")) throw error;

    console.error("Delete failed:", error);
    return { message: "Failed to delete entry." };
  }
}

