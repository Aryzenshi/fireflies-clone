import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowRightIcon, SparklesIcon } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { COMING_SOON_PAGES } from "@/lib/constants";

export function generateStaticParams() {
  return Object.keys(COMING_SOON_PAGES).map((slug) => ({ slug }));
}

export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = COMING_SOON_PAGES[slug];

  if (!page) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-5 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <SparklesIcon size={24} />
      </span>
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-[24px] font-semibold text-ink">{page.title}</h1>
        <Badge tone="purple">Coming soon</Badge>
      </div>
      <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-muted">{page.description}</p>
      <p className="mt-3 max-w-[560px] rounded-[10px] border border-dashed border-border bg-white px-4 py-3 text-[12px] text-muted">
        {page.note}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/meetings"
          className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Go to meetings <ArrowRightIcon size={14} />
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-[9px] border border-border bg-white px-4 text-[13px] text-ink-soft transition-colors hover:bg-surface"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
