import path from "path";
import { z } from "zod";

import type { JobRole } from "@/types/content";
import { mutateJsonFile, readJsonFile } from "@/server/data/fileStore";

const JOBS_PATH = path.join(process.cwd(), "src", "data", "jobs.json");
const JOBS_FALLBACK: JobRole[] = [];

const jobSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    location: z.string(),
    type: z.string(),
    description: z.string(),
    link: z.string().optional(),
  })
);

export async function readJobs(): Promise<JobRole[]> {
  return readJsonFile(JOBS_PATH, jobSchema, JOBS_FALLBACK) as Promise<JobRole[]>;
}

export async function updateJobs<R>(
  mutator: (current: JobRole[]) => Promise<{ data: JobRole[]; result: R }> | { data: JobRole[]; result: R }
): Promise<R> {
  return mutateJsonFile(JOBS_PATH, jobSchema, mutator, JOBS_FALLBACK);
}
