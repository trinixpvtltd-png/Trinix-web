import { NextResponse } from "next/server";
import { adminDb } from "@/server/firebase/admin";
import type { JobRole } from "@/types/content";
import jobs from "@/data/jobs.json";
  // http://localhost:3000/api/migrate/jobs
export async function GET() {
  try {
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("jobs");

    const now = new Date().toISOString();

    (jobs as JobRole[]).forEach((job) => {
      const docRef = collectionRef.doc(job.id);
      batch.set(docRef, {
        ...job,
        updated_at: now,
      });
    });

    await batch.commit();

    return NextResponse.json({
      status: "Migration successful",
      count: jobs.length,
      collection: "jobs",
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
