"use client";

import { useActionState, useState } from "react";
import type { ResearchCatalogue } from "@/server/data/researchStore";
import { SaveButton } from "../blog/SaveButton";
import { type ResearchFormState, deleteResearchEntry, upsertResearchEntry } from "./actions";

const INITIAL_STATE: ResearchFormState = {};
type Entry = NonNullable<ResearchCatalogue["ongoing"]>[number];
type Props = { entry: Entry };

function joinList(values?: string[]): string {
  return values?.join("\n") ?? "";
}

export function OngoingRow({ entry }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useActionState(upsertResearchEntry, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState(deleteResearchEntry, INITIAL_STATE);
  const [file, setFile] = useState<File | null>(null);
  const [showFileInput, setShowFileInput] = useState(!entry.pdf); // ✅ show input only if no file exists

  return (
    <>
      <tr className="hover:bg-white/5">
        <td className="px-4 py-4 font-medium text-white">{entry.title}</td>
        <td className="px-4 py-4 text-white/60">{entry.server}</td>
        <td className="px-4 py-4 text-white/60">{entry.identifier ?? "—"}</td>
        <td className="px-4 py-4 text-white/60">{entry.version_date ?? "—"}</td>
        <td className="px-4 py-4 text-right">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-aurora-teal/60 hover:text-white"
          >
            {isEditing ? "Close" : "Edit"}
          </button>
        </td>
      </tr>

      {isEditing && (
        <tr className="bg-black/40">
          <td colSpan={5} className="px-4 py-6">
            <div className="space-y-6">
              {/* ✅ EDIT FORM */}
              <form
                action={async (formData) => {
                  if (file) formData.append("pdfFile", file);
                  await updateAction(formData);
                }}
                className="grid gap-4 md:grid-cols-2"
              >
                <input type="hidden" name="collection" value="ongoing" />
                <input type="hidden" name="originalId" value={entry.id} />

                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    Title
                  </label>
                  <input
                    name="title"
                    defaultValue={entry.title}
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* ID */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    Identifier
                  </label>
                  <input
                    name="id"
                    defaultValue={entry.id}
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Server */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    Server
                  </label>
                  <input
                    name="server"
                    defaultValue={entry.server}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* External Identifier */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    External Identifier
                  </label>
                  <input
                    name="identifier"
                    defaultValue={entry.identifier ?? ""}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
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
                    defaultValue={entry.version_date ?? ""}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* PDF File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    PDF File
                  </label>

                  {/* Existing PDF section */}
                  {entry.pdf && !showFileInput && (
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <a
                        href={entry.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-aurora-teal underline"
                      >
                        View Current PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowFileInput(true)}
                        className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/70 hover:text-white hover:border-aurora-teal/60"
                      >
                        Replace PDF
                      </button>
                    </div>
                  )}

                  {/* File input (shown if no file yet OR user chose Replace) */}
                  {showFileInput && (
                    <input
                      type="file"
                      name="pdfFile"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-white file:hover:bg-white/20 cursor-pointer"
                    />
                  )}

                  {/* Show selected file name */}
                  {file && (
                    <p className="text-xs text-white/50 mt-1">
                      New file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
                    defaultValue={entry.abstract ?? ""}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
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
                    defaultValue={joinList(entry.authors)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/60">
                    Domains
                  </label>
                  <textarea
                    name="domain"
                    rows={3}
                    defaultValue={joinList(entry.domain)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
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
                    defaultValue={entry.modal ? JSON.stringify(entry.modal, null, 2) : ""}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-xs text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {updateState.message && (
                  <p className="md:col-span-2 text-xs text-aurora-rose">{updateState.message}</p>
                )}

                {/* Buttons */}
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/70 transition hover:text-white"
                  >
                    Cancel
                  </button>
                  <SaveButton label="Save Changes" pendingLabel="Saving…" />
                </div>
              </form>

              {/* 🗑️ DELETE FORM */}
              <form
                action={deleteAction}
                onSubmit={(e) => {
                  if (!confirm(`Delete ${entry.title}? This cannot be undone.`)) e.preventDefault();
                }}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white">Remove ongoing research</p>
                  <p className="text-xs text-white/60">
                    This will delete the record and its uploaded PDF.
                  </p>
                </div>
                <div>
                  <input type="hidden" name="collection" value="ongoing" />
                  <input type="hidden" name="id" value={entry.id} />
                  <SaveButton label="Delete" pendingLabel="Deleting…" variant="danger" />
                </div>
              </form>

              {deleteState.message && (
                <p className="text-xs text-aurora-rose">{deleteState.message}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

