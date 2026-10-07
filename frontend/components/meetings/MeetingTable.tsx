"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MeetingsIcon, MoreIcon, TrashIcon, EditIcon, LinkIcon, ArrowRightIcon } from "@/components/icons";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/States";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

export interface MeetingTableProps {
  meetings: MeetingListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onEdit: (meeting: MeetingListItem) => void;
  onDelete: (meeting: MeetingListItem) => void;
  onCopyLink: (meeting: MeetingListItem) => void;
  onFilterByTag?: (tag: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

export function MeetingTable({
  meetings,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
  onCopyLink,
  onFilterByTag,
  emptyTitle = "No meetings yet",
  emptyDescription = "Create a meeting or import a transcript to get started.",
  emptyAction,
}: MeetingTableProps) {
  if (loading) {
    return (
      <div className="rounded-[12px] border border-border bg-white">
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] border border-border bg-white">
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="rounded-[12px] border border-border bg-white">
        <EmptyState
          icon={<MeetingsIcon size={20} />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-border bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-2.5 font-medium">Meeting</th>
            <th scope="col" className="hidden w-[124px] px-4 py-2.5 font-medium md:table-cell">Date</th>
            <th scope="col" className="hidden w-[104px] px-4 py-2.5 font-medium sm:table-cell">Duration</th>
            <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Participants</th>
            <th scope="col" className="w-12 px-2 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {meetings.map((meeting) => (
            <tr key={meeting.id} className="group transition-colors hover:bg-surface">
              <td className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
                    <MeetingsIcon size={15} />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/meetings/${meeting.id}`}
                      className="line-clamp-2 text-[13.5px] font-medium text-ink hover:text-primary-hover"
                    >
                      {meeting.title}
                    </Link>
                    <div className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-[11.5px] text-muted">
                      <span className="md:hidden">{formatDate(meeting.started_at)}</span>
                      <span className="truncate">Host: {meeting.host_name ?? "—"}</span>
                      {meeting.open_action_item_count > 0 ? (
                        <span className="hidden shrink-0 text-ink-soft md:inline">
                          · {meeting.open_action_item_count} open{" "}
                          {meeting.open_action_item_count === 1 ? "task" : "tasks"}
                        </span>
                      ) : null}
                      {meeting.source_type !== "seed" ? (
                        <Badge tone="purple" size="xs">
                          {meeting.source_type === "import" ? "Imported" : "Created"}
                        </Badge>
                      ) : null}
                    </div>
                    {meeting.tags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {meeting.tags.slice(0, 4).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => onFilterByTag?.(tag)}
                            disabled={!onFilterByTag}
                            aria-label={`Filter meetings tagged ${tag}`}
                            className="inline-flex items-center rounded-full border border-primary-border bg-primary-soft px-2 py-[1px] text-[10.5px] text-primary-hover transition-colors hover:border-primary disabled:cursor-default"
                          >
                            {tag}
                          </button>
                        ))}
                        {meeting.tags.length > 4 ? (
                          <span className="text-[10.5px] text-muted">+{meeting.tags.length - 4}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="hidden w-[124px] px-4 py-3 md:table-cell">
                <p className="text-[12.5px] text-ink-soft">{formatDate(meeting.started_at)}</p>
                <p className="text-[11.5px] text-muted">{formatTime(meeting.started_at)}</p>
              </td>
              <td className="hidden w-[104px] px-4 py-3 text-[12.5px] text-ink-soft sm:table-cell">
                {formatDuration(meeting.duration_seconds)}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="flex items-center gap-2">
                  <AvatarStack names={meeting.participants.map((participant) => participant.name)} />
                  <span className="text-[11.5px] text-muted">{meeting.participants.length}</span>
                </div>
              </td>
              <td className="px-2 py-3 text-right">
                <Dropdown
                  label={`Actions for ${meeting.title}`}
                  width={196}
                  trigger={({ toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-label={`Actions for ${meeting.title}`}
                      className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <MoreIcon size={15} />
                    </button>
                  )}
                  items={[
                    {
                      id: "open",
                      label: "Open notepad",
                      icon: <ArrowRightIcon size={14} />,
                      onSelect: () => {
                        window.location.assign(`/meetings/${meeting.id}`);
                      },
                    },
                    {
                      id: "edit",
                      label: "Edit details",
                      icon: <EditIcon size={14} />,
                      onSelect: () => onEdit(meeting),
                    },
                    {
                      id: "link",
                      label: "Copy link",
                      icon: <LinkIcon size={14} />,
                      onSelect: () => onCopyLink(meeting),
                    },
                    {
                      id: "delete",
                      label: "Delete meeting",
                      icon: <TrashIcon size={14} />,
                      destructive: true,
                      onSelect: () => onDelete(meeting),
                    },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
