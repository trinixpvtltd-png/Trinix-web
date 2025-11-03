import { z } from "zod";
import { adminDb } from "@/server/firebase/admin";
import { FieldPath } from "firebase-admin/firestore"; // ✅ Needed for documentId()

// ----------------------
// 🔹 Schema Definitions
// ----------------------

const actionSchema = z.object({
  label: z.string(),
  href: z.string(),
  target: z.string().optional(),
  download: z.boolean().optional(),
  variant: z.string().optional(),
});

const modalSchema = z.object({
  layout: z.string().optional(),
  sections: z.record(z.boolean()).optional(),
  actions: z.array(actionSchema).optional(),
});

const publishedEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()).optional(),
  venue: z.string().optional(),
  doi: z.string().optional(),
  open_access: z.boolean().optional(),
  domain: z.array(z.string()).optional(),
  modal: modalSchema.optional(),
});

const preprintEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()).optional(),
  server: z.string().optional(),
  identifier: z.string().optional(),
  version_date: z.string().optional(),
  abstract: z.string().optional(),
  pdf: z.string().optional(),
  domain: z.array(z.string()).optional(),
  modal: modalSchema.optional(),
});

const ongoingEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()).optional(),
  server: z.string().optional(),
  identifier: z.string().optional(),
  version_date: z.string().optional(),
  abstract: z.string().optional(),
  pdf: z.string().optional(),
  domain: z.array(z.string()).optional(),
  modal: modalSchema.optional(),
  milestone_next: z.string().optional(),
  eta: z.string().optional(),
});

// ----------------------
// 🔹 Root Schema
// ----------------------

export const researchSchema = z.object({
  published: z.array(publishedEntrySchema).optional(),
  preprints: z.array(preprintEntrySchema).optional(),
  ongoing: z.array(ongoingEntrySchema).optional(),
});

// ----------------------
// 🔹 Types
// ----------------------

export type ResearchCatalogue = z.infer<typeof researchSchema>;
export type PublishedEntry = z.infer<typeof publishedEntrySchema>;
export type PreprintEntry = z.infer<typeof preprintEntrySchema>;
export type OngoingEntry = z.infer<typeof ongoingEntrySchema>;

// ----------------------
// 🔹 Utility
// ----------------------

function cleanFirestoreData(obj: Record<string, any>) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
}

// ----------------------
// 🔹 CRUD Operations
// ----------------------

/**
 * List all documents in a given research collection.
 * Fixed to order by Firestore document ID.
 */
export async function listResearch<T extends keyof ResearchCatalogue>(
  collection: T
): Promise<NonNullable<ResearchCatalogue[T]>> {
  const snap = await adminDb
    .collection(collection)
    .orderBy(FieldPath.documentId()) // ✅ Fix: order by document ID
    .get();

  return snap.docs.map((d) => ({
    ...(d.data() as NonNullable<ResearchCatalogue[T]>[number]),
    id: d.id, // ✅ Ensure `id` always exists
  }));
}

/**
 * Get a single document from a research collection.
 */
export async function getResearch<T extends keyof ResearchCatalogue>(
  collection: T,
  id: string
): Promise<NonNullable<ResearchCatalogue[T]>[number] | null> {
  const doc = await adminDb.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return {
    ...(doc.data() as NonNullable<ResearchCatalogue[T]>[number]),
    id: doc.id,
  };
}

/**
 * Create or update a research entry (validated with Zod).
 */
export async function upsertResearch<T extends keyof ResearchCatalogue>(
  collection: T,
  data: NonNullable<ResearchCatalogue[T]>[number]
) {
  let validated: PublishedEntry | PreprintEntry | OngoingEntry;

  switch (collection) {
    case "published":
      validated = await publishedEntrySchema.parseAsync(data);
      break;
    case "preprints":
      validated = await preprintEntrySchema.parseAsync(data);
      break;
    case "ongoing":
      validated = await ongoingEntrySchema.parseAsync(data);
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  const { id, ...payload } = validated;
  const cleaned = cleanFirestoreData(payload);

  await adminDb
    .collection(collection)
    .doc(id)
    .set(
      {
        ...cleaned,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

  console.log(`✅ Upserted research entry [${collection}/${id}]`);
  return validated;
}

/**
 * Delete a research entry by ID.
 */
export async function deleteResearch(
  collection: keyof ResearchCatalogue,
  id: string
) {
  await adminDb.collection(collection).doc(id).delete();
  console.log(`🗑️ Deleted research entry [${collection}/${id}]`);
  return { id };
}
