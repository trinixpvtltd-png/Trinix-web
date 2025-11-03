import { z } from "zod";
import { adminDb } from "@/server/firebase/admin";
import type { Project } from "@/types/content";

const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  status: z.string(),
  domain: z.string().optional(),
  keyFeatures: z.array(z.string()).optional(),
  ctas: z.array(ctaSchema).optional(),
  link: z.string().optional(),
  spotlightNote: z.string().optional(),
  updated_at: z.string().optional(),
});

const collectionRef = adminDb.collection("projects");


export async function readProjects(): Promise<Project[]> {
  try {
    const snapshot = await collectionRef.orderBy("name").get();

    const projects = snapshot.docs.map((doc) => ({
      ...(doc.data() as Omit<Project, "id">), 
      id: doc.id,
    }));

    const parsed = z.array(projectSchema).safeParse(projects);
    if (!parsed.success) {
      console.warn("⚠️ Project data validation failed:", parsed.error.format());
      return [];
    }

    return parsed.data;
  } catch (err) {
    console.error("❌ Failed to read projects:", err);
    return [];
  }
}
export async function updateProjects<R>(
  mutator:
    | ((current: Project[]) => Promise<{ data: Project[]; result: R }>)
    | ((current: Project[]) => { data: Project[]; result: R })
): Promise<R> {
  try {
    const currentSnapshot = await collectionRef.get();
    const currentProjects: Project[] = currentSnapshot.docs.map((doc) => ({
      ...(doc.data() as Omit<Project, "id">),
      id: doc.id,
    }));

    const mutation = await mutator(currentProjects);

    const batch = adminDb.batch();
    for (const project of mutation.data) {
      const docRef = collectionRef.doc(project.id);
      batch.set(docRef, { ...project, updated_at: new Date().toISOString() }, { merge: true });
    }

    await batch.commit();
    return mutation.result;
  } catch (err) {
    console.error("Failed to update projects:", err);
    throw err;
  }
}
