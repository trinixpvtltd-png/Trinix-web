import { NextResponse } from "next/server";
import { adminDb } from "@/server/firebase/admin";
import projects from "@/data/projects.json";
import type { Project } from "@/types/content";

/**
 * 🔥 One-time Firestore migration route
 * - Uploads all projects from local JSON into Firestore
 * - Uses project.id as Firestore document ID
 * - Skips if already exists (to prevent overwriting)
 * // http://localhost:3000/api/migrate/projects
 */
export async function GET() {
  try {
    const collectionRef = adminDb.collection("projects");

    // Fetch existing Firestore project IDs
    const existingSnapshot = await collectionRef.get();
    const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));

    const batch = adminDb.batch();
    let created = 0;
    let skipped = 0;

    for (const project of projects as Project[]) {
      if (!project.id) continue;

      if (existingIds.has(project.id)) {
        skipped++;
        continue; // don’t overwrite existing data
      }

      const docRef = collectionRef.doc(project.id);
      batch.set(docRef, {
        ...project,
        updated_at: new Date().toISOString(),
      });
      created++;
    }

    if (created > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      status: "✅ Migration complete",
      created,
      skipped,
      total: projects.length,
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
