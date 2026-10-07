"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ListIcon,
  SearchIcon,
  StatusIcon,
  TeamIcon,
  WaveIcon,
} from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { Spinner } from "@/components/ui/Spinner";
import { useCurrentUser, useStats } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { COMING_SOON_PAGES } from "@/lib/constants";

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/meetings")) return "Meetings";
  if (pathname.startsWith("/uploads")) return "Uploads";
  if (pathname.startsWith("/settings")) return "Settings";
  const slug = pathname.split("/")[2];
  return COMING_SOON_PAGES[slug]?.title ?? "fireflies.ai";
}

export function Topbar({
  onOpenSidebar,
  navOpen = false,
}: {
  onOpenSidebar?: () => void;
  navOpen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { info } = useToast();
  const stats = useStats();
  const user = useCurrentUser();
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/meetings?q=${encodeURIComponent(query)}` : "/meetings");
  };

  const minutesLeft = stats.data?.transcription_minutes_left ?? null;
  const quota = stats.data?.transcription_minutes_quota ?? 800;

  return (
    <header className="flex h-[46px] shrink-0 items-center gap-3 border-b border-border bg-white px-3.5">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        aria-expanded={navOpen}
        aria-controls="app-sidebar"
        className="rounded-md p-1.5 text-muted hover:bg-surface-muted md:hidden"
      >
        <ListIcon size={17} />
      </button>

      <p className="hidden min-w-[86px] shrink-0 text-[13.5px] font-semibold font-heading text-ink md:block">
        {pageTitle(pathname)}
      </p>

      <form onSubmit={runSearch} className="relative min-w-0 flex-1 md:max-w-[420px]">
        <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft" />
        <input
          ref={inputRef}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search meetings, transcripts..."
          aria-label="Search meetings"
          className="h-[34px] w-full rounded-sm border border-border bg-surface pl-9 pr-20 text-[12.5px] text-ink placeholder:text-muted-soft focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 md:flex">
          <kbd className="rounded border border-border bg-white px-1 py-[1px] text-[10px] font-medium text-muted">Ctrl</kbd>
          <kbd className="rounded border border-border bg-white px-1 py-[1px] text-[10px] font-medium text-muted">K</kbd>
        </span>
      </form>


      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/coming-soon/upgrade"
          className="hidden h-[28px] items-center rounded-sm bg-orange-100 px-3 text-[11px] font-semibold tracking-wide text-orange-600 transition-colors hover:bg-orange-200 lg:inline-flex"
        >
          UPGRADE
        </Link>

        <div className="hidden items-center gap-3 border-l border-border pl-3 2xl:flex">
          <div className="flex items-center gap-1.5">
            <StatusIcon size={14} className="text-muted" />
            <div className="leading-tight">
              <p className="text-[10px] text-muted">Transcription</p>
              <p className="text-[10.5px] font-medium text-[#e8b487]">
                {minutesLeft === null ? (
                  <Spinner size={10} className="text-muted" />
                ) : (
                  `${Math.max(0, 100 - Math.floor((quota - minutesLeft) / 5))} credits`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <WaveIcon size={14} className="text-muted" />
            <div className="leading-tight">
              <p className="text-[10px] text-muted">Storage</p>
              <p className="text-[10.5px] font-medium text-[#4ade80]">
                {stats.data ? `${quota - stats.data.transcript_minutes} mins left / ${quota} mins` : "—"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => info("Inviting teammates is out of scope", "This build assumes a single signed-in user.")}
          aria-label="Invite teammates"
          className="hidden h-[28px] w-[28px] items-center justify-center rounded-sm bg-primary text-white transition-colors hover:bg-primary-hover sm:flex"
        >
          <TeamIcon size={15} />
        </button>

        <Dropdown
          label="Account menu"
          width={216}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Open account menu"
              className="flex items-center rounded-sm"
            >
              {user.data ? (
                <Avatar name={user.data.name} size={26} shape="square" />
              ) : (
                <span className="h-[26px] w-[26px] rounded-sm bg-surface-muted" />
              )}
            </button>
          )}
          items={[
            {
              id: "profile",
              label: user.data?.name ?? "Profile",
              description: user.data?.email,
              onSelect: () => router.push("/settings"),
            },
            { id: "settings", label: "Settings", onSelect: () => router.push("/settings") },
            {
              id: "referral",
              label: "Copy referral link",
              onSelect: () => info("Referral link copied", "Placeholder action."),
            },
            {
              id: "signout",
              label: "Sign out (not implemented)",
              onSelect: () => info("Authentication is out of scope", "The app runs as a single seeded user."),
            },
          ]}
        />
      </div>
    </header>
  );
}
