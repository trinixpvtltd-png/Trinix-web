"use client";

import { useState } from "react";
import { SaveButton } from "../blog/SaveButton";
import { type ResearchFormState, upsertResearchEntry } from "./actions";
import { useActionState } from "react";

const INITIAL_STATE: ResearchFormState = {};

export function CreateOngoingForm() {
  const [state, formAction] = useActionState(upsertResearchEntry, INITIAL_STATE);
  const [file, setFile] = useState<File | null>(null);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Add Ongoing Research
          </h2>
          <p className="text-sm text-white/70">
            Track active research projects with abstracts, PDFs, and modal metadata.
          </p>
        </div>
      </div>

      <form
        action={async (formData) => {
          if (file) formData.append("pdfFile", file);
          await formAction(formData);
        }}
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="collection" value="ongoing" />

        {/* Title */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Title
          </label>
          <input
            name="title"
            required
            placeholder="Research title"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Identifier */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Identifier
          </label>
          <input
            name="id"
            required
            placeholder="Unique ID"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Server */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Server
          </label>
          <input
            name="server"
            required
            placeholder="Trinix Research, ArXiv, etc"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* External Identifier */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            External Identifier
          </label>
          <input
            name="identifier"
            placeholder="TRX-2025-OG"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Version Date */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Version Date
          </label>
          <input
            name="version_date"
            type="date"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* PDF File Input (upload on submit only) */}
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Upload Research PDF
          </label>
          <input
            type="file"
            name="pdfFile"
            accept="application/pdf"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-white file:hover:bg-white/20 cursor-pointer"
          />
          {file && (
            <p className="text-xs text-white/50 mt-1">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Abstract */}
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Abstract
          </label>
          <textarea
            name="abstract"
            rows={4}
            placeholder="Key findings and context"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Authors */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Authors
          </label>
          <textarea
            name="authors"
            rows={3}
            placeholder="One author per line"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Domains */}
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Domains
          </label>
          <textarea
            name="domain"
            rows={3}
            placeholder="AI, Cognitive Science"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-aurora-teal/60"
          />
        </div>

        {/* Modal JSON */}
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
            Modal JSON
          </label>
          <textarea
            name="modal"
            rows={4}
            placeholder='{"layout":"research-square","pdf":"<url>"}'
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none focus:border-aurora-teal/60"
          />
        </div>
        {/* Message */}
        {state.message && (
          <p
            className={`md:col-span-2 text-xs ${
              state.message.startsWith("✅")
                ? "text-green-400"
                : "text-aurora-rose"
            }`}
          >
            {state.message}
          </p>
        )}

        {/* Submit */}
        <div className="md:col-span-2 flex justify-end">
          <SaveButton label="Create Ongoing Entry" pendingLabel="Uploading…" />
        </div>
      </form>
    </section>
  );
}
