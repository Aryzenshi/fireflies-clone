"use client";

import { useEffect, useRef, useState } from "react";

import { ChatIcon, CheckIcon, CloseIcon, EditIcon } from "@/components/icons";
import { formatDuration } from "@/lib/format";
import { highlightParts } from "@/lib/transcript";
import type { TranscriptSegment } from "@/lib/types";

export interface TranscriptLineProps {
  segment: TranscriptSegment;
  active: boolean;
  isCurrentMatch: boolean;
  /** ordinal (within this segment) of the currently selected search match, or -1 */
  currentMatchOrdinal: number;
  query: string;
  onSeek: (segment: TranscriptSegment) => void;
  onSave: (segmentId: string, text: string) => Promise<void>;
  /** how many comments are anchored to this line (0 hides the indicator) */
  commentCount?: number;
  onComment?: (segment: TranscriptSegment) => void;
}

export function TranscriptLine({
  segment,
  active,
  isCurrentMatch,
  currentMatchOrdinal,
  query,
  onSeek,
  onSave,
  commentCount = 0,
  onComment,
}: TranscriptLineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(segment.text);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(segment.text);
      window.setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }, [editing, segment.text]);

  const save = async () => {
    const next = draft.trim();
    if (!next || next === segment.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(segment.id, next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const parts = highlightParts(segment.text, query);
  let matchCounter = -1;

  return (
    <li
      data-segment-id={segment.id}
      className={[
        "group relative border-l-2 transition-colors",
        active ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface",
        isCurrentMatch ? "bg-highlight/35" : "",
      ].join(" ")}
    >
      {editing ? (
        <div className="px-3.5 py-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{segment.speaker}</span>
            <span className="font-mono text-[11px] text-muted">{formatDuration(segment.start_seconds)}</span>
          </div>
          <textarea
            ref={textareaRef}
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save();
            }}
            className="w-full resize-y rounded-[9px] border border-primary-border bg-white px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-primary px-2.5 text-[11.5px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <CheckIcon size={12} />
              {saving ? "Saving…" : "Save line"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-border px-2.5 text-[11.5px] text-ink-soft transition-colors hover:bg-surface"
            >
              <CloseIcon size={12} />
              Cancel
            </button>
            <span className="text-[11px] text-muted">Ctrl/⌘ + Enter to save</span>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Play from ${formatDuration(segment.start_seconds)} — ${segment.speaker}`}
          onClick={() => onSeek(segment)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSeek(segment);
            }
          }}
          className="flex w-full cursor-pointer gap-3 px-3.5 py-2 text-left"
        >
          <span
            className={`w-[42px] shrink-0 pt-[1px] font-mono text-[11px] ${
              active ? "text-primary" : "text-muted"
            }`}
          >
            {formatDuration(segment.start_seconds)}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[10.5px] font-semibold uppercase tracking-[0.07em] ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              {segment.speaker}
            </span>
            {commentCount > 0 ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft px-1.5 py-[1px] text-[10px] text-primary-hover">
                <ChatIcon size={10} />
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </span>
            ) : null}
            <span className="mt-0.5 block pr-6 text-[13px] leading-[1.55] text-ink">
              {parts.map((part, index) => {
                if (!part.match) return <span key={index}>{part.text}</span>;
                matchCounter += 1;
                const current = currentMatchOrdinal === matchCounter;
                return (
                  <mark
                    key={index}
                    className={`rounded-[3px] px-[1px] ${
                      current ? "bg-highlight-active text-white" : "bg-highlight text-primary-hover"
                    }`}
                  >
                    {part.text}
                  </mark>
                );
              })}
            </span>
          </span>
        </div>
      )}

      {!editing && onComment ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onComment(segment);
          }}
          aria-label={`Comment on this line (${formatDuration(segment.start_seconds)})`}
          className="absolute right-8 top-2 rounded-md p-1 text-muted-soft opacity-0 transition-all hover:bg-white hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ChatIcon size={13} />
        </button>
      ) : null}

      {!editing ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
          aria-label="Edit transcript line"
          className="absolute right-2 top-2 rounded-md p-1 text-muted-soft opacity-0 transition-all hover:bg-white hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
        >
          <EditIcon size={13} />
        </button>
      ) : null}
    </li>
  );
}
