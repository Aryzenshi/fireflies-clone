"use client";

import { CopyIcon, RefreshIcon, SparklesIcon } from "@/components/icons";
import { ActionItems } from "@/components/notepad/ActionItems";
import { CommentsPanel } from "@/components/notepad/CommentsPanel";
import { useToast } from "@/hooks/useToast";
import { formatDuration } from "@/lib/format";
import type {
  ActionItem,
  Comment,
  ActionItemInput,
  ActionItemPatch,
  MeetingDetail,
  Participant,
  Summary,
  SummarySection,
} from "@/lib/types";

function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">{children}</h3>
      {action}
    </div>
  );
}

export interface SummaryPanelProps {
  meeting: MeetingDetail;
  summary: Summary;
  actionItems: ActionItem[];
  participants: Participant[];
  busyActionIds: string[];
  regenerating: boolean;
  onSeekToTime: (seconds: number) => void;
  onCreateActionItem: (payload: ActionItemInput) => Promise<void>;
  onUpdateActionItem: (itemId: string, payload: ActionItemPatch) => Promise<void>;
  onDeleteActionItem: (itemId: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  comments: Comment[];
  busyCommentIds: string[];
  onAddComment: () => void;
  onEditComment: (commentId: string, body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

/** Left-hand AI notes panel: overview, key points, action items and chapters. */
export function SummaryPanel({
  meeting,
  summary,
  actionItems,
  participants,
  busyActionIds,
  regenerating,
  onSeekToTime,
  onCreateActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onRegenerate,
  comments,
  busyCommentIds,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: SummaryPanelProps) {
  const toast = useToast();

  const copySummary = async () => {
    const lines = [
      `${meeting.title}`,
      `Overview: ${summary.overview}`,
      "",
      "Key points:",
      ...summary.key_points.map((point) => `- ${point}`),
      "",
      "Action items:",
      ...actionItems.map((item) => `- [${item.completed ? "x" : " "}] ${item.title}${item.assignee ? ` (${item.assignee})` : ""}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast.success("Notes copied", "Overview, key points and action items are on your clipboard.");
    } catch {
      toast.error("Could not copy the notes", "Your browser blocked clipboard access.");
    }
  };

  return (
    <section className="scroll-area min-h-0 min-w-0 flex-1 bg-white" aria-label="AI notes">
      <div className="border-b border-border px-3.5 py-2">
        <div className="flex items-center gap-2">
          <h2 className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-ink">AI Notes</h2>
          {/* Hidden in the narrow two-panel layout: at 860px the badge squeezed the
              heading onto two lines, which the reference never does. */}
          <span className="hidden items-center gap-1 rounded-full border border-primary-border bg-primary-soft px-1.5 py-[1px] text-[10px] font-medium text-primary-hover xl:inline-flex">
            <SparklesIcon size={10} />
            Auto-generated
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => void onRegenerate()}
              disabled={regenerating}
              className="inline-flex h-[26px] items-center gap-1 rounded-[7px] border border-border bg-white px-2 text-[11px] text-ink-soft transition-colors hover:bg-surface disabled:opacity-60"
            >
              <RefreshIcon size={12} className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "Regenerating" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={() => void copySummary()}
              aria-label="Copy notes"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <CopyIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-3.5 py-3.5">
        <div className="space-y-1.5">
          <SectionTitle>Overview</SectionTitle>
          <p className="text-[13px] leading-[1.6] text-ink-soft">{summary.overview}</p>
        </div>

        {summary.key_points.length > 0 ? (
          <div className="space-y-2">
            <SectionTitle>Key points</SectionTitle>
            <ul className="space-y-1.5">
              {summary.key_points.map((point, index) => (
                <li key={index} className="flex gap-2.5 text-[13px] leading-[1.55] text-ink-soft">
                  <span aria-hidden="true" className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ActionItems
          items={actionItems}
          participants={participants}
          busyIds={busyActionIds}
          onCreate={onCreateActionItem}
          onUpdate={onUpdateActionItem}
          onDelete={onDeleteActionItem}
        />

        {summary.sections.length > 0 ? (
          <div className="space-y-2">
            <SectionTitle>Chapters &amp; outline</SectionTitle>
            <ul className="space-y-2.5">
              {summary.sections.map((section: SummarySection) => (
                <li key={section.id} className="rounded-[10px] border border-border bg-surface px-2.5 py-2">
                  <button
                    type="button"
                    onClick={() => onSeekToTime(section.timestamp_seconds ?? 0)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="font-mono text-[11px] font-medium text-primary hover:underline">
                      {formatDuration(section.timestamp_seconds ?? 0)}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] font-medium text-ink">{section.title}</span>
                  </button>
                  {section.bullets.length > 0 ? (
                    <ul className="mt-1 space-y-1 pl-[52px]">
                      {section.bullets.map((bullet, index) => (
                        <li key={index} className="text-[12px] leading-[1.5] text-muted">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.topics.length > 0 ? (
          <div className="space-y-2">
            <SectionTitle>Topics</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {summary.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-border bg-white px-2 py-[3px] text-[11.5px] text-ink-soft"
                >
                  #{topic}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <CommentsPanel
          comments={comments}
          busyCommentIds={busyCommentIds}
          onSeekToTime={onSeekToTime}
          onAdd={onAddComment}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
        />
      </div>
    </section>
  );
}
