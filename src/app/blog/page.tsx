"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/server/firebase/client";
import { formatDate } from "@/lib/formatDate";
import type { BlogPost } from "@/data/blogPosts";

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "blog"), orderBy("publication_date", "desc"));
        const snapshot = await getDocs(q);

        const fetched: BlogPost[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as BlogPost),
        }));

        setPosts(fetched);
      } catch (err) {
        console.error("❌ Failed to load blog posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const activePost = useMemo(
    () => posts.find((post) => post.slug === activeSlug) ?? null,
    [activeSlug, posts]
  );

  useEffect(() => {
    if (typeof document === "undefined" || !activePost) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setActiveSlug(null);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePost]);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(61,245,242,0.12),transparent_65%)]" />

      <div className="mx-auto max-w-6xl space-y-16 px-6 py-24 text-white md:px-10">
        {/* Header */}
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-aurora-teal/80">Signal Threads</p>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">
            Insights from the Trinix Lab
          </h1>
          <p className="max-w-2xl text-sm text-white/70">
            Deep dives into Vedic-aligned intelligence, quantum-native infrastructure, and
            the ecosystems we build with our partners.
          </p>
        </header>

        {/* Blog Cards */}
        {loading ? (
          <p className="text-center text-white/60">Loading posts...</p>
        ) : posts.length > 0 ? (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => {
              const pubDate = post.publication_date || post.published_at;
              const formattedDate = pubDate ? formatDate(pubDate, "short") ?? pubDate : "TBA";

              const metaParts: string[] = [];
              if (post.author?.trim()) metaParts.push(post.author.trim());
              if (post.estimated_read_duration?.trim())
                metaParts.push(post.estimated_read_duration.trim());

              const metaLabel = metaParts.join(" • ");

              return (
                <button
                  key={post.id ?? post.slug ?? index}
                  type="button"
                  onClick={() => setActiveSlug(post.slug)}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-white/80 shadow-aurora backdrop-blur-xl transition hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurora-teal/60"
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-aurora-teal/10 via-transparent to-copper-gold/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="text-xs uppercase tracking-[0.3em] text-aurora-teal/70">
                    Entry {index + 1}
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-white">
                    {post.title}
                  </h2>
                  <p className="mt-3 text-sm text-white/70">{post.blurb}</p>
                  {metaLabel && (
                    <p className="mt-4 text-xs uppercase tracking-[0.25em] text-white/60">
                      {metaLabel}
                    </p>
                  )}
                  <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/50">
                    <span>{formattedDate}</span>
                    <span className="inline-flex items-center gap-2 text-aurora-teal group-hover:text-white">
                      Read <span aria-hidden>→</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        ) : (
          <p className="text-center text-white/60">No blog posts found.</p>
        )}
      </div>

      {/* Modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl px-6 py-10"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveSlug(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-white/8 p-6 text-white shadow-aurora backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveSlug(null)}
              className="absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1 text-sm text-white/80 hover:text-white"
            >
              ×
            </button>

            <p className="text-xs uppercase tracking-[0.3em] text-aurora-teal/70">Signal Thread</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white">
              {activePost.title}
            </h2>

            <p className="mt-2 text-sm text-white/60">
              {activePost.publication_date
                ? formatDate(activePost.publication_date, "long")
                : "Publication date TBA"}
            </p>
            {activePost.author && (
              <p className="mt-1 text-sm text-white/50">By {activePost.author}</p>
            )}
            {activePost.description_points && (
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-white/70">
                {activePost.description_points.map((point, i) => (
                  <p key={i}>• {point}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

