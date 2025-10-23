import path from "path";
import { z } from "zod";

import type { Project } from "@/types/content";
import { mutateJsonFile, readJsonFile } from "@/server/data/fileStore";

const PROJECT_PATH = path.join(process.cwd(), "src", "data", "projects.json");
const PROJECT_FALLBACK: Project[] = [];

const ctaSchema = z.object({ label: z.string(), href: z.string() });

const projectSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    summary: z.string(),
    status: z.string(),
    domain: z.string().optional(),
    keyFeatures: z.array(z.string()).optional(),
    ctas: z.array(ctaSchema).optional(),
    link: z.string().optional(),
    spotlightNote: z.string().optional(),
  })
);

export async function readProjects(): Promise<Project[]> {
  return readJsonFile(PROJECT_PATH, projectSchema, PROJECT_FALLBACK) as Promise<Project[]>;
}

export async function updateProjects<R>(
  mutator: (current: Project[]) => Promise<{ data: Project[]; result: R }> | { data: Project[]; result: R }
): Promise<R> {
  return mutateJsonFile(PROJECT_PATH, projectSchema, mutator, PROJECT_FALLBACK);
}
