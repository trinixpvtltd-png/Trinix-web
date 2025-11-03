import { CreateOngoingForm } from "./CreateOngoingForm";
import { CreatePreprintForm } from "./CreatePreprintForm";
import { CreatePublishedForm } from "./CreatePublishedForm";
import { OngoingTable } from "./OngoingTable";
import { PreprintTable } from "./PreprintTable";
import { PublishedTable } from "./PublishedTable";

import { listResearch } from "@/server/data/researchStore";

export default async function AdminResearchPage() {
  const [published, preprints, ongoing] = await Promise.all([
    listResearch("published"),
    listResearch("preprints"),
    listResearch("ongoing"),
  ]);

  return (
    <div className="space-y-8 text-white">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Research Library</h1>
        <p className="text-sm text-white/70">
          Maintain the canonical corpus of publications, preprints, and ongoing explorations.
        </p>
      </header>

      {/* Published Section */}
      <div className="space-y-6">
        <CreatePublishedForm />
        <PublishedTable entries={published} />
      </div>

      {/* Preprints Section */}
      <div className="space-y-6">
        <CreatePreprintForm />
        <PreprintTable entries={preprints} />
      </div>

      {/* Ongoing Section */}
      <div className="space-y-6">
        <CreateOngoingForm />
        <OngoingTable entries={ongoing} />
      </div>
    </div>
  );
}
