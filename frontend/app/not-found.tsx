import Link from "next/link";

import { LogoMark } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center px-5 py-20 text-center">
      <LogoMark size={40} />
      <h1 className="mt-4 text-[22px] font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-[13px] text-muted">
        The page you were looking for does not exist in this workspace. It may have been deleted.
      </p>
      <Link
        href="/meetings"
        className="mt-5 inline-flex h-9 items-center rounded-[9px] bg-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Back to meetings
      </Link>
    </div>
  );
}
