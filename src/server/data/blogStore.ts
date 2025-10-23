import path from "path";
import { z } from "zod";

import type { BlogPost } from "@/data/blogPosts";
import { mutateJsonFile, readJsonFile } from "@/server/data/fileStore";

const BLOG_PATH = path.join(process.cwd(), "src", "data", "blogPosts.json");
const BLOG_FALLBACK: BlogPost[] = [];

const blogSchema = z.array(
  z.object({
    slug: z.string(),
    title: z.string(),
    blurb: z.string(),
    author: z.string().optional(),
    published_at: z.string().optional(),
    publication_date: z.string().optional(),
    estimated_read_duration: z.string().optional(),
    description_points: z.array(z.string()).optional(),
  })
);

export async function readBlogPosts(): Promise<BlogPost[]> {
  return readJsonFile(BLOG_PATH, blogSchema, BLOG_FALLBACK);
}

export async function updateBlogPosts<R>(
  mutator: (current: BlogPost[]) => Promise<{ data: BlogPost[]; result: R }> | { data: BlogPost[]; result: R }
): Promise<R> {
  return mutateJsonFile(BLOG_PATH, blogSchema, mutator, BLOG_FALLBACK);
}
