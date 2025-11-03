import { z } from "zod";
import { adminDb } from "@/server/firebase/admin";
import type { JobRole } from "@/types/content";
const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  location: z.string(),
  type: z.string(),
  description: z.string(),
  link: z.string().optional(),
  updated_at: z.string().optional(),
});

const collectionRef = adminDb.collection("jobs");


export async function readJobs(): Promise<JobRole[]> {
  try {
    const snapshot = await collectionRef.orderBy("title").get();

    const jobs: JobRole[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<JobRole, "id">; 
      return { ...data, id: doc.id }; 
    });

    const parsed = z.array(jobSchema).safeParse(jobs);
    if (!parsed.success) {
      console.warn("⚠️ Job data validation failed:", parsed.error.format());
      return [];
    }

    return parsed.data;
  } catch (err) {
    console.error("Failed to read job roles:", err);
    return [];
  }
}


export async function updateJobs<R>(
  mutator:
    | ((current: JobRole[]) => Promise<{ data: JobRole[]; result: R }>)
    | ((current: JobRole[]) => { data: JobRole[]; result: R })
): Promise<R> {
  try {
    const snapshot = await collectionRef.get();

    const currentJobs: JobRole[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<JobRole, "id">;
      return { ...data, id: doc.id };
    });

    const mutation = await mutator(currentJobs);

    const batch = adminDb.batch();
    for (const job of mutation.data) {
      const { id, ...rest } = job;
      const docRef = collectionRef.doc(id);
      batch.set(
        docRef,
        { ...rest, updated_at: new Date().toISOString() },
        { merge: true }
      );
    }

    await batch.commit();
    return mutation.result;
  } catch (err) {
    console.error(" Failed to update jobs:", err);
    throw err;
  }
}


export async function deleteJob(id: string): Promise<void> {
  try {
    const docRef = collectionRef.doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.warn(` Job not found: ${id}`);
      return;
    }

    await docRef.delete();
    console.log(` Deleted job: ${id}`);
  } catch (err) {
    console.error("Failed to delete job:", err);
    throw err;
  }
}
