"use client";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/server/firebase/client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ResearchHero } from "@/components/research/ResearchHero";
import { ResearchTabs } from "@/components/research/ResearchTabs";
import { FiltersBar, Filters as FiltersType } from "@/components/research/FiltersBar";
import { PublishedList } from "@/components/research/PublishedList";
import { PreprintList } from "@/components/research/PreprintList";
import { Modal } from "@/components/research/Modal";
import { formatDate } from "@/lib/formatDate";
import { useRouter, useSearchParams } from "next/navigation";

type TabId = "published" | "preprints" | "ongoing";

type PublishedPub = {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  doi?: string;
  pdf?: string;
  code?: string;
  open_access?: boolean;
  award?: string;
  domain?: string[];
};

type PreprintPub = {
  id: string;
  title: string;
  authors: string[];
  server: string;
  identifier: string;
  version_date: string;
  pdf?: string;
  domain?: string[];
  abstract?: string;
};

type OngoingItem = PreprintPub;

type Data = {
  published: PublishedPub[];
  preprints: PreprintPub[];
  ongoing: OngoingItem[];
};

const HASH_PREFIX = "pubs";

/** 🧹 Normalize Firestore doc so authors is always an array */
function normalizeAuthors(data: any): string[] {
  if (Array.isArray(data?.authors)) return data.authors;
  if (typeof data?.authors === "string" && data.authors.trim()) return [data.authors];
  return ["Unknown Author"];
}

function ResearchModalLayout({
  titleId,
  descId,
  title,
  meta,
  onClose,
  children,
}: {
  titleId: string;
  descId: string;
  title: string;
  meta: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-xl md:text-2xl font-semibold">
            {title}
          </h2>
          <div id={descId} className="mt-1 text-xs text-white/70">
            {meta}
          </div>
        </div>
        <button
          data-autofocus
          className="rounded-md border border-white/20 px-3 py-1 text-sm text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aurora-teal/60"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function ModalInfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-white/60">{label}</div>
      <div className="mt-1 text-sm text-white/80">{children}</div>
    </div>
  );
}

export function ResearchHub() {
  const [active, setActive] = useState<TabId>("published");
  const [data, setData] = useState<Data>({ published: [], preprints: [], ongoing: [] });
  type SortKey = "Newest" | "Oldest" | "Most Popular" | "A-Z" | "Z-A";
  const [filters, setFilters] = useState<FiltersType>({ q: "", year: "", domain: "", sort: "Newest" });
  const [modal, setModal] = useState<{ kind: "preprint" | "ongoing"; id: string } | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  // --- Load hash from URL
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, "");
    const [k, v] = h.split("=");
    if (k === HASH_PREFIX && (v === "published" || v === "preprints" || v === "ongoing")) setActive(v as TabId);
  }, []);

  // --- Sync hash with tab
  useEffect(() => {
    const url = new URL(window.location.href);
    url.hash = `${HASH_PREFIX}=${active}`;
    window.history.replaceState(null, "", url);
  }, [active]);

  // --- Live Firestore listeners
  useEffect(() => {
    const unsubPublished = onSnapshot(collection(db, "published"), (snap) =>
      setData((prev) => ({
        ...prev,
        published: snap.docs.map((d) => {
          const doc = d.data();
          return {
            id: d.id,
            ...doc,
            authors: normalizeAuthors(doc),
          } as PublishedPub;
        }),
      }))
    );

    const unsubPreprints = onSnapshot(collection(db, "preprints"), (snap) =>
      setData((prev) => ({
        ...prev,
        preprints: snap.docs.map((d) => {
          const doc = d.data();
          return {
            id: d.id,
            ...doc,
            authors: normalizeAuthors(doc),
          } as PreprintPub;
        }),
      }))
    );

    const unsubOngoing = onSnapshot(collection(db, "ongoing"), (snap) =>
      setData((prev) => ({
        ...prev,
        ongoing: snap.docs.map((d) => {
          const doc = d.data();
          return {
            id: d.id,
            ...doc,
            authors: normalizeAuthors(doc),
          } as OngoingItem;
        }),
      }))
    );

    return () => {
      unsubPublished();
      unsubPreprints();
      unsubOngoing();
    };
  }, []);

  // --- Year filter options
  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    data.published.forEach((p) => typeof p.year === "number" && ys.add(p.year));
    return Array.from(ys).sort((a, b) => b - a);
  }, [data.published]);

  const textMatch = useCallback((txt: string, q: string) => txt.toLowerCase().includes(q.toLowerCase()), []);
  const arrMatch = useCallback((arr: string[] | undefined, v: string) => {
    if (!v) return true;
    if (!arr) return false;
    return arr.some((x) => x.toLowerCase() === v.toLowerCase());
  }, []);

  const sortBy = useCallback(function sortBy<T extends { title?: string; year?: number }>(arr: T[], key: SortKey) {
    const cp = [...arr];
    if (key === "Newest") cp.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (key === "Oldest") cp.sort((a, b) => (a.year || 0) - (b.year || 0));
    else if (key === "Most Popular") cp.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (key === "A-Z") cp.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (key === "Z-A") cp.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    return cp;
  }, []);

  // --- Open modal via query
  useEffect(() => {
    const mid = params?.get("modal");
    const mkind = params?.get("kind");
    if (!mid) return;
    if (mkind === "preprint" || mkind === "ongoing") {
      setModal({ id: mid, kind: mkind });
      setActive(mkind === "preprint" ? "preprints" : "ongoing");
      return;
    }
    const isPre = data.preprints.some((x) => x.id === mid);
    const isOg = data.ongoing.some((x) => x.id === mid);
    if (isPre) setModal({ id: mid, kind: "preprint" });
    else if (isOg) setModal({ id: mid, kind: "ongoing" });
  }, [params, data.preprints, data.ongoing]);

  // --- Filters
  const pubFiltered = useMemo(() => {
    const q = filters.q.trim();
    const items = data.published.filter(
      (p) =>
        (q ? textMatch(p.title || "", q) || textMatch(p.authors.join(", "), q) || textMatch(p.venue || "", q) : true) &&
        (filters.year ? String(p.year) === filters.year : true) &&
        (filters.domain ? arrMatch(p.domain, filters.domain) : true)
    );
    return sortBy(items, filters.sort as SortKey);
  }, [data.published, filters, textMatch, arrMatch, sortBy]);

  const preFiltered = useMemo(() => {
    const q = filters.q.trim();
    const items = data.preprints.filter(
      (p) =>
        (q ? textMatch(p.title || "", q) || textMatch(p.authors.join(", "), q) || textMatch(p.server || "", q) : true) &&
        (filters.domain ? arrMatch(p.domain, filters.domain) : true)
    );
    return sortBy(items, filters.sort as SortKey);
  }, [data.preprints, filters, textMatch, arrMatch, sortBy]);

  const ogFiltered = useMemo(() => {
    const q = filters.q.trim();
    const items = data.ongoing.filter(
      (p) =>
        (q ? textMatch(p.title || "", q) || textMatch(p.authors.join(", "), q) || textMatch(p.server || "", q) : true) &&
        (filters.domain ? arrMatch(p.domain, filters.domain) : true)
    );
    return sortBy(items, filters.sort as SortKey);
  }, [data.ongoing, filters, textMatch, arrMatch, sortBy]);

  function openPreprint(id: string) {
    setModal({ kind: "preprint", id });
    const url = new URL(window.location.href);
    url.searchParams.set("modal", id);
    url.searchParams.set("kind", "preprint");
    router.replace(url.toString());
  }

  function openOngoing(id: string) {
    setModal({ kind: "ongoing", id });
    const url = new URL(window.location.href);
    url.searchParams.set("modal", id);
    url.searchParams.set("kind", "ongoing");
    router.replace(url.toString());
  }

  function closeModal() {
    setModal(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("modal");
    url.searchParams.delete("kind");
    router.replace(url.toString());
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 md:py-16">
      <ResearchHero />

      <div className="mt-6 flex items-center justify-between gap-4">
        <ResearchTabs active={active} onChange={setActive} />
        <FiltersBar years={yearOptions} filters={filters} onChange={setFilters} />
      </div>

      <div className="mt-8" role="region" aria-live="polite">
        <section hidden={active !== "published"}>
          <PublishedList items={pubFiltered} />
        </section>
        <section hidden={active !== "preprints"}>
          <PreprintList items={preFiltered} onOpen={openPreprint} />
        </section>
        <section hidden={active !== "ongoing"}>
          <PreprintList items={ogFiltered} onOpen={openOngoing} />
        </section>
      </div>

      {/* --- Shared Modal Layout for Preprints & Ongoing --- */}
      {["preprint", "ongoing"].map((kind) => (
        <Modal key={kind} open={!!modal && modal.kind === kind} onClose={closeModal}>
          {(() => {
            if (!modal || modal.kind !== kind) return null;
            const p = data[kind === "preprint" ? "preprints" : "ongoing"].find((x) => x.id === modal.id);
            if (!p) return <div>No data.</div>;
            const meta = `${p.server} • ${p.identifier} • ${formatDate(p.version_date, "short") || "In progress"}`;
            return (
              <ResearchModalLayout
                titleId="modal-title"
                descId="modal-desc"
                title={p.title}
                meta={meta}
                onClose={closeModal}
              >
                <ModalInfoBlock label="Authors">{p.authors.join(", ")}</ModalInfoBlock>
                {p.abstract && (
                  <ModalInfoBlock label="Abstract">
                    <p className="whitespace-pre-wrap">{p.abstract}</p>
                  </ModalInfoBlock>
                )}
                <ModalInfoBlock label="Manuscript">
                  {p.pdf ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-white/10 overflow-hidden shadow-md">
                        <iframe src={p.pdf} className="w-full h-[75vh]" title={`${kind} PDF`} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <a
                          href={p.pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-aurora-teal/40 px-3 py-1 hover:border-white"
                        >
                          Open in new tab
                        </a>
                        <a
                          href={p.pdf}
                          download
                          className="rounded-md border border-white/20 px-3 py-1 text-white/80 hover:text-white"
                        >
                          Download
                        </a>
                        <span className="text-xs text-white/50 self-center">
                          If the viewer is blocked, use Download.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-white/60">No PDF available.</div>
                  )}
                </ModalInfoBlock>
              </ResearchModalLayout>
            );
          })()}
        </Modal>
      ))}
    </div>
  );
}
