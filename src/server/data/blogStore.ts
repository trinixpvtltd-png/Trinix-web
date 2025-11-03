import { z } from "zod";
import { adminDb } from "@/server/firebase/admin";
import type { BlogPost } from "@/data/blogPosts";


const blogSchema = z.object({
  slug: z.string(),
  title: z.string(),
  blurb: z.string(),
  author: z.string().optional(),
  published_at: z.string().optional(),
  publication_date: z.string().optional(),
  estimated_read_duration: z.string().optional(),
  description_points: z.array(z.string()).optional(),
  updated_at: z.string().optional(),
});

// -------------------------------
// 🔹 READ: All blog posts
// -------------------------------
export async function readBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await adminDb
      .collection("blog")
      .orderBy("published_at", "desc")
      .get();

    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as BlogPost),
    }));

    // Validate structure
    const parsed = z.array(blogSchema).safeParse(posts);
    if (!parsed.success) {
      console.warn("⚠️ Blog data validation failed:", parsed.error.format());
      return [];
    }

    return parsed.data;
  } catch (error) {
    console.error("❌ Failed to read blog posts:", error);
    return [];
  }
}

// -------------------------------
// 🔹 READ: Single blog post
// -------------------------------
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const doc = await adminDb.collection("blog").doc(slug).get();
    if (!doc.exists) return null;

    const parsed = blogSchema.safeParse(doc.data());
    if (!parsed.success) {
      console.warn("⚠️ Invalid blog post data:", parsed.error.format());
      return null;
    }

    return { id: doc.id, ...parsed.data };
  } catch (error) {
    console.error("❌ Failed to fetch blog post:", error);
    return null;
  }
}

// -------------------------------
// 🔹 MUTATE: Update (or create)
// -------------------------------
export async function updateBlogPosts<R>(
  mutator:
    | ((current: BlogPost[]) => Promise<{ data: BlogPost[]; result: R }>)
    | ((current: BlogPost[]) => { data: BlogPost[]; result: R })
): Promise<R> {
  // Load current posts
  const currentPosts = await readBlogPosts();
  const mutation = await mutator(currentPosts);

  // Push all updated posts to Firestore
  const batch = adminDb.batch();
  const collectionRef = adminDb.collection("blog");

  for (const post of mutation.data) {
    const docRef = collectionRef.doc(post.slug);
    batch.set(docRef, { ...post, updated_at: new Date().toISOString() }, { merge: true });
  }

  await batch.commit();

  return mutation.result;
}
