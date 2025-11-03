"use client";
import { useActionState, useState } from "react";
import type { BlogPost } from "@/data/blogPosts";
import { type BlogFormState, deleteBlogPost, upsertBlogPost } from "./actions";
import { SaveButton } from "./SaveButton";

const INITIAL_STATE: BlogFormState = {};

type Props = {
  post: BlogPost;
  formattedDate: string;
};

export function BlogPostRow({ post, formattedDate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [updateState, updateAction] = useActionState(upsertBlogPost, INITIAL_STATE);
  const [deleteState, deleteAction] = useActionState(deleteBlogPost, INITIAL_STATE);

  const draftDate = post.published_at?.slice(0, 10) ?? "";
  const publicationDate = post.publication_date?.slice(0, 10) ?? "";
  const descriptionPoints = post.description_points ?? [];

  return (
    <>
      {/* 🧱 Non-editing table row */}
      <tr className="hover:bg-white/5">
        {/* Title */}
        <td
          className="px-4 py-4 max-w-[240px] truncate font-medium text-white align-top"
          title={post.title}
        >
          {post.title}
        </td>

        {/* Author */}
        <td
          className="px-4 py-4 max-w-[140px] truncate text-white/70 align-top"
          title={post.author || "—"}
        >
          {post.author || "—"}
        </td>

        {/* Date */}
        <td className="px-4 py-4 whitespace-nowrap align-top">{formattedDate}</td>

        {/* Duration */}
        <td className="px-4 py-4 text-white/70 whitespace-nowrap align-top">
          {post.estimated_read_duration || "—"}
        </td>

        {/* Blurb */}
        <td
          className="px-4 py-4 max-w-[300px] truncate text-white/60 align-top"
          title={post.blurb}
        >
          {post.blurb}
        </td>

        {/* Edit Button */}
        <td className="px-4 py-4 text-right align-top">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="inline-flex items-center rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-aurora-teal/60 hover:text-white"
          >
            {isEditing ? "Close" : "Edit"}
          </button>
        </td>
      </tr>

      {/* ✏️ Editing section */}
      {isEditing ? (
        <tr className="bg-black/40">
          <td colSpan={6} className="px-4 py-6">
            <div className="space-y-6">
              <form action={updateAction} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="originalSlug" value={post.slug} />

                {/* Title */}
                <div className="md:col-span-2">
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`title-${post.slug}`}
                  >
                    Title
                  </label>
                  <input
                    id={`title-${post.slug}`}
                    name="title"
                    defaultValue={post.title}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                    required
                  />
                  {updateState.errors?.title ? (
                    <p className="mt-1 text-xs text-aurora-rose">
                      {updateState.errors.title}
                    </p>
                  ) : null}
                </div>

                {/* Slug */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`slug-${post.slug}`}
                  >
                    Slug
                  </label>
                  <input
                    id={`slug-${post.slug}`}
                    name="slug"
                    defaultValue={post.slug}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                  {updateState.errors?.slug ? (
                    <p className="mt-1 text-xs text-aurora-rose">
                      {updateState.errors.slug}
                    </p>
                  ) : null}
                </div>

                {/* Author */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`author-${post.slug}`}
                  >
                    Author
                  </label>
                  <input
                    id={`author-${post.slug}`}
                    name="author"
                    defaultValue={post.author ?? ""}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Published Date */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`published-${post.slug}`}
                  >
                    Published
                  </label>
                  <input
                    id={`published-${post.slug}`}
                    name="published_at"
                    type="date"
                    defaultValue={draftDate}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Publication Date */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`publication-${post.slug}`}
                  >
                    Publication Date
                  </label>
                  <input
                    id={`publication-${post.slug}`}
                    name="publication_date"
                    type="date"
                    defaultValue={publicationDate}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Read Duration */}
                <div>
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`read-duration-${post.slug}`}
                  >
                    Read Duration
                  </label>
                  <input
                    id={`read-duration-${post.slug}`}
                    name="estimated_read_duration"
                    defaultValue={post.estimated_read_duration ?? ""}
                    placeholder="e.g., 5 min read"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                  />
                </div>

                {/* Description Points */}
                <div className="md:col-span-2">
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`description-${post.slug}`}
                  >
                    Description Points
                  </label>
                  <p className="mt-1 text-xs text-white/50">
                    Update up to five short statements to refresh the popup overview.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <input
                        key={index}
                        name="description_points"
                        defaultValue={descriptionPoints[index] ?? ""}
                        className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                        placeholder={`Point ${index + 1}`}
                      />
                    ))}
                  </div>
                  {updateState.errors?.description_points ? (
                    <p className="mt-1 text-xs text-aurora-rose">
                      {updateState.errors.description_points}
                    </p>
                  ) : null}
                </div>

                {/* Blurb */}
                <div className="md:col-span-2">
                  <label
                    className="block text-xs uppercase tracking-[0.2em] text-white/60"
                    htmlFor={`blurb-${post.slug}`}
                  >
                    Excerpt
                  </label>
                  <textarea
                    id={`blurb-${post.slug}`}
                    name="blurb"
                    rows={3}
                    defaultValue={post.blurb}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition focus:border-aurora-teal/60"
                    required
                  />
                  {updateState.errors?.blurb ? (
                    <p className="mt-1 text-xs text-aurora-rose">
                      {updateState.errors.blurb}
                    </p>
                  ) : null}
                </div>

                {/* Form Errors */}
                {updateState.message ? (
                  <p className="md:col-span-2 text-xs text-aurora-rose">
                    {updateState.message}
                  </p>
                ) : null}

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

              {/* Delete Form */}
              <form
                action={deleteAction}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/60 px-4 py-3"
                onSubmit={(event) => {
                  if (!window.confirm(`Delete ${post.title}? This cannot be undone.`)) {
                    event.preventDefault();
                  }
                }}
              >
                <div>
                  <p className="text-sm text-white">Remove post</p>
                  <p className="text-xs text-white/60">
                    Deletes the entry from the public feed immediately.
                  </p>
                </div>
                <div>
                  <input type="hidden" name="slug" value={post.slug} />
                  <SaveButton label="Delete" pendingLabel="Deleting…" variant="danger" />
                </div>
              </form>

              {deleteState.message ? (
                <p className="text-xs text-aurora-rose">{deleteState.message}</p>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
