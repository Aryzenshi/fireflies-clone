"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  CopyIcon,
  SearchIcon,
  WaveIcon,
} from "@/components/icons";
import { TranscriptLine } from "@/components/notepad/TranscriptLine";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/hooks/useToast";
import { findMatches } from "@/lib/transcript";
import type { TranscriptMatch } from "@/lib/transcript";
import type { TranscriptSegment } from "@/lib/types";

export interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  activeSegmentId: string | null;
  onSeekSegment: (segment: TranscriptSegment) => void;
  onSaveSegment: (segmentId: string, text: string) => Promise<void>;
  /** comment counts keyed by segment id (from the meeting's comments) */
  commentCounts?: Record<string, number>;
  onCommentSegment?: (segment: TranscriptSegment) => void;
  /** speaker filter chip value coming from the parent (optional) */
  headerNote?: string;
}

/**
 * Transcript panel with in-panel search + highlighting.
 *
 * Search highlight is purely local state: it never replaces the transcript rows,
 * so clicking a line still seeks the shared player.
 */
export function TranscriptPanel({
  segments,
  activeSegmentId,
  onSeekSegment,
  onSaveSegment,
  commentCounts,
  onCommentSegment,
  headerNote,
}: TranscriptPanelProps) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRowRef = useRef<HTMLLIElement | null>(null);

  const matches = useMemo<TranscriptMatch[]>(() => findMatches(segments, query), [segments, query]);
  const currentMatch = matches.length > 0 ? matches[Math.min(matchIndex, matches.length - 1)] : null;

  // Ordinal of the current match *inside its own segment* (for highlight styling).
  const currentMatchOrdinal = useMemo(() => {
    if (!currentMatch) return -1;
    return matches.filter((match) => match.segmentId === currentMatch.segmentId).findIndex((match) => match === currentMatch);
  }, [currentMatch, matches]);

  // Reset navigation whenever the query (or transcript) changes.
  useEffect(() => {
    setMatchIndex(0);
  }, [query, segments.length]);

  const gotoMatch = useCallback(
    (nextIndex: number) => {
      if (matches.length === 0) return;
      const wrapped = ((nextIndex % matches.length) + matches.length) % matches.length;
      setMatchIndex(wrapped);
      const match = matches[wrapped];
      const segment = segments.find((item) => item.id === match.segmentId);
      if (segment) {
        onSeekSegment(segment);
        const row = listRef.current?.querySelector<HTMLLIElement>(`[data-segment-id="${segment.id}"]`);
        row?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
    [matches, onSeekSegment, segments],
  );

  // Follow playback: keep the active line visible while the player advances.
  useEffect(() => {
    if (!follow || !activeSegmentId) return;
    const row =
      listRef.current?.querySelector<HTMLLIElement>(`[data-segment-id="${activeSegmentId}"]`) ?? null;
    if (!row) return;
    activeRowRef.current = row;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeSegmentId, follow]);

  const copyTranscript = async () => {
    const text = segments
      .map((segment) => `[${new Date(segment.start_seconds * 1000).toISOString().substr(14, 5)}] ${segment.speaker}: ${segment.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transcript copied", `${segments.length} segments copied to the clipboard.`);
    } catch {
      toast.error("Could not copy the transcript", "Your browser blocked clipboard access.");
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white" aria-label="AI transcript">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[13px] font-semibold text-ink">AI Transcript</h2>
          <span className="hidden text-[11px] text-muted sm:inline">
            {segments.length} segments{headerNote ? ` · ${headerNote}` : ""}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {searchOpen || query ? (
            <div className="relative flex items-center">
              <SearchIcon size={13} className="pointer-events-none absolute left-2.5 text-muted-soft" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    gotoMatch(matchIndex + (event.shiftKey ? -1 : 1));
                  }
                  if (event.key === "Escape") {
                    setQuery("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search transcript..."
                aria-label="Search within transcript"
                className="h-[30px] w-[186px] rounded-[8px] border border-border bg-surface pl-7 pr-[74px] text-[12px] focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12"
              />
              <span className="absolute right-1 flex items-center gap-0.5">
                <span className="mr-0.5 tabular-nums text-[10.5px] text-muted">
                  {matches.length === 0 ? "0/0" : `${matchIndex + 1}/${matches.length}`}
                </span>
                <button
                  type="button"
                  onClick={() => gotoMatch(matchIndex - 1)}
                  disabled={matches.length === 0}
                  aria-label="Previous match"
                  className="rounded p-0.5 text-muted transition-colors hover:bg-white hover:text-ink disabled:opacity-40"
                >
                  <ChevronUpIcon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => gotoMatch(matchIndex + 1)}
                  disabled={matches.length === 0}
                  aria-label="Next match"
                  className="rounded p-0.5 text-muted transition-colors hover:bg-white hover:text-ink disabled:opacity-40"
                >
                  <ChevronDownIcon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  aria-label="Close transcript search"
                  className="rounded p-0.5 text-muted transition-colors hover:bg-white hover:text-ink"
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-[28px] items-center gap-1.5 rounded-[8px] border border-border bg-white px-2 text-[11.5px] text-ink-soft transition-colors hover:bg-surface"
            >
              <SearchIcon size={13} />
              Search transcript
            </button>
          )}

          <button
            type="button"
            onClick={() => setFollow((current) => !current)}
            aria-pressed={follow}
            title="Scroll the transcript with playback"
            className={`hidden h-[28px] items-center gap-1.5 rounded-[8px] border px-2 text-[11.5px] transition-colors sm:inline-flex ${
              follow
                ? "border-primary-border bg-primary-soft text-primary-hover"
                : "border-border bg-white text-muted hover:bg-surface"
            }`}
          >
            <WaveIcon size={13} />
            Follow
          </button>

          <button
            type="button"
            onClick={() => void copyTranscript()}
            aria-label="Copy transcript"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <CopyIcon size={15} />
          </button>
        </div>
      </header>

      {segments.length === 0 ? (
        <EmptyState
          icon={<WaveIcon size={20} />}
          title="No transcript yet"
          description="Replace the transcript for this meeting to unlock search, playback sync and AI notes."
          className="flex-1"
        />
      ) : (
        <div ref={listRef} className="scroll-area min-h-0 flex-1" data-testid="transcript-list">
          <ol className="pb-6">
            {segments.map((segment) => (
              <TranscriptLine
                key={segment.id}
                segment={segment}
                active={segment.id === activeSegmentId}
                isCurrentMatch={currentMatch?.segmentId === segment.id}
                currentMatchOrdinal={currentMatch?.segmentId === segment.id ? currentMatchOrdinal : -1}
                query={query}
                onSeek={onSeekSegment}
                onSave={onSaveSegment}
                commentCount={commentCounts?.[segment.id] ?? 0}
                onComment={onCommentSegment}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
