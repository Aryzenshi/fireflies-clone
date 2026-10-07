"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ChevronLeftIcon,
  EditIcon,
  MoreIcon,
  SoundbiteIcon,
  SparklesIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import { AvatarStack } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useToast } from "@/hooks/useToast";
import { formatDatePadded, formatDuration, formatTime } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

export interface MeetingHeaderBarProps {
  meeting: MeetingDetail;
  onRename: (title: string) => Promise<void>;
  onEditDetails: () => void;
  onShare: () => void;
  onReplaceTranscript: () => void;
  onDelete: () => void;
}

export function MeetingHeaderBar({
  meeting,
  onRename,
  onEditDetails,
  onShare,
  onReplaceTranscript,
  onDelete,
}: MeetingHeaderBarProps) {
  const toast = useToast();
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState(meeting.title);

  useEffect(() => {
    setDraft(meeting.title);
  }, [meeting.title]);

  const commit = async () => {
    const next = draft.trim();
    setEditingTitle(false);
    if (!next || next === meeting.title) {
      setDraft(meeting.title);
      return;
    }
    await onRename(next);
  };

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2">
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-[12px] text-muted transition-colors hover:bg-surface-muted hover:text-ink-soft"
      >
        <ChevronLeftIcon size={13} />
        <span className="hidden sm:inline">All meetings</span>
      </Link>
      <span className="text-muted-soft">/</span>

      {/* The title is the page's main heading: a button inside an h1 keeps click-to-rename
          while giving the notepad a real document outline for screen readers. */}
      {editingTitle ? (
        <input
          autoFocus
          aria-label="Meeting title"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") void commit();
            if (event.key === "Escape") {
              setDraft(meeting.title);
              setEditingTitle(false);
            }
          }}
          className="h-[28px] min-w-[160px] max-w-[360px] flex-1 rounded-[7px] border border-primary bg-white px-2 text-[13.5px] font-semibold outline-none"
        />
      ) : (
        <h1 className="flex min-w-0">
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
            className="group flex min-w-0 items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="truncate text-[13.5px] font-semibold text-ink">{meeting.title}</span>
            <EditIcon size={12} className="shrink-0 text-muted-soft opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </h1>
      )}

      <span className="hidden items-center gap-2 text-[11.5px] text-muted lg:flex">
        <span>·</span>
        <span>{formatDatePadded(meeting.started_at)}</span>
        <span>{formatTime(meeting.started_at)}</span>
        <span>·</span>
        <span>{formatDuration(meeting.duration_seconds)}</span>
      </span>

      {meeting.tags.length > 0 ? (
        <span className="hidden shrink-0 items-center gap-1 xl:flex">
          {meeting.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-primary-border bg-primary-soft px-2 py-[1px] text-[10.5px] text-primary-hover"
            >
              {tag}
            </span>
          ))}
          {meeting.tags.length > 3 ? (
            <span className="text-[10.5px] text-muted">+{meeting.tags.length - 3}</span>
          ) : null}
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden md:flex">
          <AvatarStack names={meeting.participants.map((participant) => participant.name)} size={22} max={3} />
        </span>

        <Link
          href="/coming-soon/upgrade"
          className="hidden h-[28px] items-center rounded-[7px] border border-border px-2 text-[11px] font-medium text-muted transition-colors hover:bg-surface lg:inline-flex"
        >
          Upgrade
        </Link>

        <button
          type="button"
          onClick={() =>
            toast.info("Soundbites are a bonus feature", "Clip creation is not part of this assignment build.")
          }
          className="hidden h-[28px] items-center gap-1.5 rounded-[7px] border border-border px-2 text-[11.5px] text-ink-soft transition-colors hover:bg-surface md:inline-flex"
        >
          <SoundbiteIcon size={13} />
          Soundbite
        </button>

        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-[28px] items-center rounded-[7px] bg-primary px-3 text-[12px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Share
        </button>

        <Dropdown
          label="Meeting actions"
          width={218}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="More meeting actions"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <MoreIcon size={16} />
            </button>
          )}
          items={[
            { id: "details", label: "Edit meeting details", icon: <EditIcon size={14} />, onSelect: onEditDetails },
            {
              id: "regenerate-hint",
              label: "Replace transcript",
              icon: <UploadIcon size={14} />,
              onSelect: onReplaceTranscript,
            },
            {
              id: "soundbite",
              label: "Create soundbite (soon)",
              icon: <SparklesIcon size={14} />,
              onSelect: () => toast.info("Soundbites are a bonus feature"),
            },
            { id: "delete", label: "Delete meeting", icon: <TrashIcon size={14} />, destructive: true, onSelect: onDelete },
          ]}
        />
      </div>
    </header>
  );
}
