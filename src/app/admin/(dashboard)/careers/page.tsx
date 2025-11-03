import { readJobs } from "@/server/data/jobStore";
import { CreateJobForm } from "./CreateJobForm";
import { JobsTable } from "./JobsTable";

export default async function AdminCareersPage() {
  const jobs = await readJobs();

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Careers Directory</h1>
        <p className="text-sm text-white/70">
          Manage open roles, update details, and keep the careers page in sync.
        </p>
      </header>

      {/* Create form */}
      <CreateJobForm />

      {/* Jobs table */}
      <JobsTable jobs={jobs} />
    </div>
  );
}

