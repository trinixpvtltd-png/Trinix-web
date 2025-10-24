import Link from "next/link";

export const metadata = {
  title: "Coming Soon | Trinix Pvt. Ltd.",
  description: "Discover upcoming launches from Trinix Pvt. Ltd.",
};

type ComingSoonPageProps = {
  searchParams?: {
    name?: string;
  };
};

export default function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const rawName = searchParams?.name ?? "";
  let projectName = "";
  if (rawName) {
    try {
      projectName = decodeURIComponent(rawName);
    } catch {
      projectName = rawName;
    }
  }
  const title = projectName ? `${projectName} is on the launchpad` : "Coming Soon";

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center bg-gradient-to-b from-black/80 via-[#03030c] to-black/90 px-6 py-20 text-center text-white">
      <div className="max-w-xl space-y-6">
        <p className="text-xs uppercase tracking-[0.35em] text-aurora-teal/70">Stay Tuned</p>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="text-sm text-white/70 md:text-base">
          We&apos;re polishing the experience to match our standards. This project page will be live shortly—check back soon or reach out to our team for early access details.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-full border border-aurora-teal/60 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white hover:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aurora-teal/60"
          >
            Back to Projects
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-[0.3em] text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-aurora-teal/60"
          >
            Contact Team
          </Link>
        </div>
      </div>
    </div>
  );
}
