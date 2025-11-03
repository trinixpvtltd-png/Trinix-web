"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateBlogPosts } from "@/server/data/blogStore";
import { adminDb } from "@/server/firebase/admin";
import { slugify } from "@/lib/slugify";
import type { BlogPost } from "@/data/blogPosts";

const blogFormSchema = z.object({
  originalSlug: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  blurb: z.string().min(1, "Excerpt is required"),
  author: z.string().optional(),
  published_at: z.string().optional(),
  publication_date: z.string().optional(),
  estimated_read_duration: z.string().optional(),
  description_points: z
    .array(z.string().min(1, "Each description point must include text"))
    .max(5, "Only five description points are allowed")
    .optional(),
});

export type BlogFormState = {
  message?: string;
  errors?: Record<string, string>;
};

class ConflictError extends Error {
  constructor(public readonly field: string, message: string) {
    super(message);
  }
}

class NotFoundError extends Error {}

export async function upsertBlogPost(prevState: BlogFormState, formData: FormData): Promise<BlogFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const rawDescriptionPoints = formData
    .getAll("description_points")
    .map((value) => value?.toString().trim() ?? "")
    .filter((value) => value.length > 0);

  const submission = blogFormSchema.safeParse({
    originalSlug: formData.get("originalSlug")?.toString(),
    title: formData.get("title")?.toString(),
    slug: formData.get("slug")?.toString(),
    blurb: formData.get("blurb")?.toString(),
    author: formData.get("author")?.toString(),
    published_at: formData.get("published_at")?.toString(),
    publication_date: formData.get("publication_date")?.toString(),
    estimated_read_duration: formData.get("estimated_read_duration")?.toString(),
    description_points: rawDescriptionPoints.length ? rawDescriptionPoints : undefined,
  });

  if (!submission.success) {
    const errors: Record<string, string> = {};
    for (const issue of submission.error.issues) {
      if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
    }
    return { errors };
  }

  const payload = submission.data;
  const normalizedSlug = slugify(payload.slug?.length ? payload.slug : payload.title);
  const nextPost: BlogPost = {
    slug: normalizedSlug,
    title: payload.title,
    blurb: payload.blurb,
    author: payload.author?.trim() || "Trinix Research",
    published_at: payload.published_at?.trim() || new Date().toISOString(),
    publication_date: payload.publication_date?.trim() || "",
    estimated_read_duration: payload.estimated_read_duration?.trim() || "",
    description_points: payload.description_points?.filter(Boolean),
  };

  let result: { action: "create" | "update"; before?: BlogPost; after: BlogPost };
  try {
    result = await updateBlogPosts((posts) => {
      const targetSlug = payload.originalSlug?.trim().length ? payload.originalSlug : normalizedSlug;
      const existingIndex = posts.findIndex((post) => post.slug === targetSlug);
      const duplicate = posts.some((post, index) => post.slug === normalizedSlug && index !== existingIndex);
      if (duplicate) throw new ConflictError("slug", "Another post already uses this slug");

      const nextPosts = [...posts];
      const action: "create" | "update" = existingIndex === -1 ? "create" : "update";
      const before = existingIndex === -1 ? undefined : posts[existingIndex];

      if (existingIndex === -1) nextPosts.unshift(nextPost);
      else nextPosts[existingIndex] = nextPost;

      return { data: nextPosts, result: { action, before, after: nextPost } };
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      return { errors: { [error.field]: error.message } };
    }
    throw error;
  }

  await appendAuditEntry({
    resource: "blog",
    action: result.action,
    userId,
    before: result.before,
    after: result.after,
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirect(`/admin/blog?updated=${encodeURIComponent(nextPost.slug)}`);
}

// ---------------------------
// 🔹 DELETE (directly in Firestore)
// ---------------------------
const deleteSchema = z.object({ slug: z.string().min(1, "Slug is required") });

export async function deleteBlogPost(prevState: BlogFormState, formData: FormData): Promise<BlogFormState> {
  const session = await getAdminSession();
  if (!session) return { message: "Unauthorized" };

  const slug = formData.get("slug")?.toString();
  const parsed = deleteSchema.safeParse({ slug });
  if (!parsed.success) return { message: "Invalid request" };

  const docRef = adminDb.collection("blog").doc(slug!);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { message: "Post not found" };

    const deletedPost = docSnap.data() as BlogPost;
    await docRef.delete();

    await appendAuditEntry({
      resource: "blog",
      action: "delete",
      userId:
        (session.user as { id?: string })?.id ??
        session.user?.email ??
        "admin",
      before: deletedPost,
      after: null,
    });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/");
    redirect(`/admin/blog?deleted=${encodeURIComponent(slug!)}`);
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { message: "Failed to delete post" };
  }
}
