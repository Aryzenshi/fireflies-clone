import { Suspense } from "react";

import { MeetingLibrary } from "@/components/meetings/MeetingLibrary";
import { TableSkeleton } from "@/components/ui/States";

export const metadata = {
  title: "Meetings — Fireflies.ai workspace",
};

function LibraryFallback() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5">
      <div className="mb-4 h-6 w-32 rounded bg-surface-muted" />
      <div className="rounded-[12px] border border-border bg-white">
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <MeetingLibrary />
    </Suspense>
  );
}
