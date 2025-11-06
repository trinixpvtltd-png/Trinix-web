import { NextResponse } from "next/server";
import { slugify } from "@/lib/slugify";
import { adminDb } from "@/server/firebase/admin";
import researchDataRaw from "../../../../../public/data/research_publications.json";

/**
 * 🔥 API Route: Migrate Research Data to Firestore (Force Include All)
 * -------------------------------------------------------------------
 * Run manually by visiting:
 *   http://localhost:3000/api/migrate/research
 *
 * (Ensures 'published', 'preprints', and 'ongoing' collections are all created)
 */

interface ResearchItem {
  id?: string;
  title: string;
  authors?: string[];
  venue?: string;
  server?: string;
  doi?: string;
  identifier?: string;
  open_access?: boolean;
  version_date?: string;
  abstract?: string;
  domain?: string[];
  pdf?: string;
  modal?: Record<string, any>;
}

interface ResearchData {
  published?: ResearchItem[];
  preprints?: ResearchItem[];
  ongoing?: ResearchItem[];
}

export async function GET() {
  try {
    console.log("🚀 Starting research data migration...");

    const data = researchDataRaw as ResearchData;
    const collections = ["published", "preprints", "ongoing"] as const;

    let totalCount = 0;

    for (const collectionName of collections) {
      const items = data[collectionName] || [];
      const collectionRef = adminDb.collection(collectionName);

      if (!items.length) {
        // 👇 Ensure the collection is created even if it's empty
        const placeholder = collectionRef.doc("_init");
        await placeholder.set(
          {
            init: true,
            note: "Auto-created placeholder for empty collection during migration.",
            created_at: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log(`⚙️ Created empty '${collectionName}' placeholder.`);
        continue;
      }

      const batch = adminDb.batch();

      for (const item of items) {
        const slug = slugify(item.id || item.title);
        const docRef = collectionRef.doc(slug);

        const payload = {
          id: item.id || slug,
          slug,
          title: item.title,
          authors: item.authors || [],
          venue: item.venue || item.server || "",
          doi: item.doi || item.identifier || "",
          open_access: item.open_access ?? false,
          version_date: item.version_date || new Date().toISOString(),
          abstract: item.abstract || "",
          domain: item.domain || [],
          pdf: item.pdf || "",
          modal: item.modal || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        batch.set(docRef, payload, { merge: true });
      }

      await batch.commit();
      console.log(`✅ Migrated ${items.length} docs to '${collectionName}'`);
      totalCount += items.length;
    }

    console.log(`🎉 Research migration complete! (${totalCount} total documents)`);

    return NextResponse.json({
      message: `✅ Successfully migrated ${totalCount} research records.`,
      total: totalCount,
    });
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    return NextResponse.json(
      { error: error.message || "Migration failed" },
      { status: 500 }
    );
  }
}
