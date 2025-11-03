import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { slugify } from "@/lib/slugify";
import { adminDb } from "@/server/firebase/admin";
import type { BlogPost } from "@/data/blogPosts";

/**
 * 🔥 API Route: Migrate Blog Posts to Firestore
 * --------------------------------------------
 * Run manually by visiting:
 *   http://localhost:3000/api/migrate/blogs
 *
 * (Make sure your Firestore Admin SDK is configured)
 */

export async function GET() {
  try {
    console.log("🚀 Starting blog migration...");

    // 1️⃣ Load local JSON
    const BLOG_PATH = path.join(process.cwd(), "src", "data", "blogPosts.json");

    if (!fs.existsSync(BLOG_PATH)) {
      return NextResponse.json(
        { error: "blogPosts.json not found" },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(BLOG_PATH, "utf-8");
    const posts: BlogPost[] = JSON.parse(raw);

    if (!posts.length) {
      return NextResponse.json(
        { message: "⚠️ No blog posts found in JSON file." },
        { status: 200 }
      );
    }

    // 2️⃣ Batch write to Firestore
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("blog");

    for (const post of posts) {
      const slug = slugify(post.slug || post.title);
      const docRef = collectionRef.doc(slug);

      const payload = {
        slug,
        title: post.title,
        blurb: post.blurb,
        author: post.author || "Trinix Research",
        published_at: post.published_at || new Date().toISOString(),
        publication_date: post.publication_date || "",
        estimated_read_duration: post.estimated_read_duration || "",
        description_points: post.description_points || [],
        updated_at: new Date().toISOString(),
      };

      batch.set(docRef, payload, { merge: true });
    }

    await batch.commit();

    console.log(`🎉 Migration complete! (${posts.length} posts uploaded)`);

    return NextResponse.json({
      message: `✅ Migrated ${posts.length} posts successfully.`,
      count: posts.length,
    });
  } catch (error: any) {
    console.error(" Migration failed:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
