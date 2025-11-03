"use client";

import { motion, useScroll } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/server/firebase/client";
import { formatDate } from "@/lib/formatDate";
import type { BlogPost } from "@/data/blogPosts";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  const formattedTitle = useMemo(() => {
    return params.slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, [params.slug]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const q = query(collection(db, "blog"), where("slug", "==", params.slug));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setPost({ id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as BlogPost) });
        } else {
          setPost(null);
        }
      } catch (err) {
        console.error(" Failed to fetch blog post:", err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [params.slug]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Scroll progress bar */}
      <motion.div className="fixed inset-x-0 top-[64px] z-40 h-1 bg-white/10">
        <motion.span
          className="block h-full origin-left bg-gradient-to-r from-aurora-teal via-indigo-core to-copper-gold"
          style={{ scaleX: scrollYProgress }}
        />
      </motion.div>

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-32 text-white">
        {loading ? (
          <p className="text-center text-white/60">Loading post...</p>
        ) : post ? (
          <>
            {/* Header section */}
            <motion.section
              className="space-y-4"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-aurora-teal/70">Signal Thread</p>
              <h1 className="font-display text-4xl font-semibold">{post.title}</h1>
              <p className="text-sm text-white/60">
                {post.author && <span>{post.author}</span>}
                {post.publication_date && (
                  <>
                    {" • "}
                    {formatDate(post.publication_date, "long")}
                  </>
                )}
                {post.estimated_read_duration && (
                  <>
                    {" • "}
                    {post.estimated_read_duration}
                  </>
                )}
              </p>
            </motion.section>

            {/* Body content */}
            <motion.section
              className="space-y-8 text-lg leading-relaxed text-white/70"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              {post.description_points && post.description_points.length > 0 ? (
                post.description_points.map((point, index) => (
                  <p key={index}>{point}</p>
                ))
              ) : (
                <p className="italic text-white/50">
                  No detailed content yet — this article will be expanded soon.
                </p>
              )}
            </motion.section>

            {/* AI summary placeholder */}
            <motion.section
              className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <p className="font-display text-lg text-white">AI Summary Placeholder</p>
              <p className="mt-2">
                Reserve this space for animated AI-assisted recaps, voiceovers, or interactive
                question-answer overlays.
              </p>
            </motion.section>
          </>
        ) : (
          <p className="text-center text-white/60">Post not found.</p>
        )}
      </div>
    </div>
  );
}
