import path from "path";
import { z } from "zod";

import { mutateJsonFile, readJsonFile } from "@/server/data/fileStore";

const RESEARCH_PATH = path.join(process.cwd(), "public", "data", "research_publications.json");

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
  milestone_next: z.string().optional(),
  eta: z.string().optional(),
});

const researchSchema = z.object({
  published: z.array(publishedEntrySchema).optional(),
  preprints: z.array(preprintEntrySchema).optional(),
  ongoing: z.array(ongoingEntrySchema).optional(),
});

export type ResearchCatalogue = z.infer<typeof researchSchema>;

const RESEARCH_FALLBACK: ResearchCatalogue = {};

export async function readResearchCatalogue(): Promise<ResearchCatalogue> {
  return readJsonFile(RESEARCH_PATH, researchSchema, RESEARCH_FALLBACK);
}

export async function updateResearchCatalogue<R>(
  mutator: (current: ResearchCatalogue) => Promise<{ data: ResearchCatalogue; result: R }> | { data: ResearchCatalogue; result: R }
): Promise<R> {
  return mutateJsonFile(RESEARCH_PATH, researchSchema, mutator, RESEARCH_FALLBACK);
}
