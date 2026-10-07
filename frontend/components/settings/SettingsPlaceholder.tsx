"use client";

import Link from "next/link";
import { useState } from "react";

import { BellIcon, ShieldIcon, TeamIcon, UpgradeIcon, SettingsIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCurrentUser, useStats } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";

const PLACEHOLDER_SECTIONS = [
  {
    id: "workspace",
    title: "Workspace",
    icon: <SettingsIcon size={15} />,
    description: "Workspace name, timezone and default transcript language.",
    rows: [
      { label: "Workspace name", value: "Demo workspace (assignment build)" },
      { label: "Timezone", value: "Asia/Kolkata (IST)" },
      { label: "Default transcript language", value: "English (US)" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: <BellIcon size={15} />,
    description: "Email digests and reminder delivery for action items.",
    rows: [
      { label: "Daily digest", value: "Off" },
      { label: "Action item reminders", value: "Off" },
    ],
  },
  {
    id: "team",
    title: "Team & access",
    icon: <TeamIcon size={15} />,
    description: "Invites, roles and sharing permissions.",
    rows: [{ label: "Members", value: "1 (single signed-in user)" }],
  },
  {
    id: "billing",
    title: "Plan & billing",
    icon: <UpgradeIcon size={15} />,
    description: "Subscription, seats and transcription credits.",
    rows: [{ label: "Plan", value: "Free (demo)" }],
  },
  {
    id: "privacy",
    title: "Privacy & retention",
    icon: <ShieldIcon size={15} />,
    description: "Recording consent, retention windows and data residency.",
    rows: [
      { label: "Transcript retention", value: "Until deleted" },
      { label: "Data residency", value: "Local SQLite file" },
    ],
  },
];

export function SettingsPlaceholder() {
  const toast = useToast();
  const user = useCurrentUser();
  const stats = useStats();
  const [toggled, setToggled] = useState<string[]>([]);

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Settings</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Profile and workspace settings. These panels are visual placeholders — the assignment asks for settings
            placeholders only.
          </p>
        </div>
        <Badge tone="orange">Placeholder</Badge>
      </div>

      <div className="mt-4 rounded-[12px] border border-border bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={user.data?.name ?? "A K"} size={44} />
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-ink">{user.data?.name ?? "Loading profile…"}</p>
            <p className="text-[12px] text-muted">{user.data?.email ?? ""}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toast.info("Profile editing is out of scope", "Authentication and user management are mocked.")}
            >
              Edit profile
            </Button>
            <Link href="/meetings">
              <Button variant="primary">Back to meetings</Button>
            </Link>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Meetings</dt>
            <dd className="text-[15px] font-semibold text-ink">{stats.data?.meeting_count ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Transcript minutes</dt>
            <dd className="text-[15px] font-semibold text-ink">{stats.data?.transcript_minutes ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted">Open action items</dt>
            <dd className="text-[15px] font-semibold text-ink">{stats.data?.open_action_items ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {PLACEHOLDER_SECTIONS.map((section) => (
          <section key={section.id} className="rounded-[12px] border border-border bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                {section.icon}
              </span>
              <h2 className="text-[13.5px] font-semibold text-ink">{section.title}</h2>
              <button
                type="button"
                onClick={() =>
                  setToggled((current) =>
                    current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id],
                  )
                }
                className={`ml-auto rounded-full border px-2 py-[2px] text-[10.5px] transition-colors ${
                  toggled.includes(section.id)
                    ? "border-primary-border bg-primary-soft text-primary-hover"
                    : "border-border text-muted hover:bg-surface"
                }`}
              >
                {toggled.includes(section.id) ? "Enabled (demo)" : "Disabled"}
              </button>
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted">{section.description}</p>
            <dl className="mt-2.5 space-y-1.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-ink-soft">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-4 rounded-[10px] border border-dashed border-border bg-white px-4 py-3 text-[12px] text-muted">
        Looking for something functional? The meetings library, notepad, transcript search, player sync, AI notes,
        action items and transcript import are all fully implemented — everything on this page is intentionally a
        placeholder.
      </p>
    </div>
  );
}
