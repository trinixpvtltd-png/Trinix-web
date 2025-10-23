"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminSession } from "@/server/auth/guards";
import { appendAuditEntry } from "@/server/data/auditLog";
import { updateBlogPosts } from "@/server/data/blogStore";
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
  if (!session) {
    return { message: "Unauthorized" };
  }
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
      if (issue.path[0]) {
        errors[issue.path[0].toString()] = issue.message;
      }
    }
    return { errors };
  }

  const payload = submission.data;
  const normalizedSlug = slugify(payload.slug?.length ? payload.slug : payload.title);
  const publishedAt = payload.published_at?.trim() ? payload.published_at : undefined;
  const author = payload.author?.trim() ? payload.author : undefined;
  const publicationDate = payload.publication_date?.trim() ? payload.publication_date : undefined;
  const estimatedReadDuration = payload.estimated_read_duration?.trim() ? payload.estimated_read_duration : undefined;
  const descriptionPoints = payload.description_points?.map((point) => point.trim()).filter((point) => point.length > 0);

  const nextPost: BlogPost = {
    slug: normalizedSlug,
    title: payload.title,
    blurb: payload.blurb,
    author,
    published_at: publishedAt,
    publication_date: publicationDate,
    estimated_read_duration: estimatedReadDuration,
    description_points: descriptionPoints && descriptionPoints.length ? descriptionPoints : undefined,
  };
  let result: { action: "create" | "update"; before?: BlogPost; after: BlogPost };
  try {
    result = await updateBlogPosts((posts) => {
      const targetSlug = payload.originalSlug?.trim().length ? payload.originalSlug : normalizedSlug;
      const existingIndex = posts.findIndex((post) => post.slug === targetSlug);
      const duplicate = posts.some((post, index) => post.slug === normalizedSlug && index !== existingIndex);
      if (duplicate) {
        throw new ConflictError("slug", "Another post already uses this slug");
      }

      const nextPosts = [...posts];
      const action: "create" | "update" = existingIndex === -1 ? "create" : "update";
      const before = existingIndex === -1 ? undefined : posts[existingIndex];

      if (existingIndex === -1) {
        nextPosts.unshift(nextPost);
      } else {
        nextPosts[existingIndex] = nextPost;
      }

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

const deleteSchema = z.object({ slug: z.string().min(1, "Slug is required") });

export async function deleteBlogPost(prevState: BlogFormState, formData: FormData): Promise<BlogFormState> {
  const session = await getAdminSession();
  if (!session) {
    return { message: "Unauthorized" };
  }

  const userId =
    (session.user as { id?: string } | undefined)?.id ??
    (session as unknown as { userId?: string }).userId ??
    session.user?.email ??
    "admin";

  const submission = deleteSchema.safeParse({ slug: formData.get("slug")?.toString() });
  if (!submission.success) {
    return { message: "Invalid request" };
  }

  let removed: BlogPost | null = null;
  try {
    removed = await updateBlogPosts((posts) => {
      const index = posts.findIndex((post) => post.slug === submission.data.slug);
      if (index === -1) {
        throw new NotFoundError("Post not found");
      }
      const nextPosts = [...posts];
      const [deleted] = nextPosts.splice(index, 1);
      return { data: nextPosts, result: deleted };
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { message: error.message };
    }
    throw error;
  }

  await appendAuditEntry({
    resource: "blog",
    action: "delete",
    userId,
    before: removed,
    after: null,
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");

  redirect(`/admin/blog?deleted=${encodeURIComponent(removed!.slug)}`);
}
