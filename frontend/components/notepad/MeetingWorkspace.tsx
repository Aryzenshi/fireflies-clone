"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MeetingHeaderBar } from "@/components/notepad/MeetingHeaderBar";
import { MediaPlayer } from "@/components/notepad/MediaPlayer";
import { ReplaceTranscriptModal } from "@/components/notepad/ReplaceTranscriptModal";
import { ShareModal } from "@/components/notepad/ShareModal";
import { CommentComposer, type CommentAnchor } from "@/components/notepad/CommentComposer";
import { SummaryPanel } from "@/components/notepad/SummaryPanel";
import { TranscriptPanel } from "@/components/notepad/TranscriptPanel";
import { MeetingSettingsModal } from "@/components/meetings/MeetingSettingsModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useMeeting } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { clampTime, findActiveSegmentIndex, transcriptDuration } from "@/lib/transcript";
import type { MeetingDetail } from "@/lib/types";

const TICK_MS = 250;

function WorkspaceSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-white px-3 py-2.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[380px] shrink-0 space-y-4 border-r border-border p-4 lg:block">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[86%]" />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-3 p-4">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-3 w-[92%]" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-border bg-white px-3.5 py-3">
        <Skeleton className="h-12 w-24 rounded-[9px]" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-2.5 flex-1" />
      </div>
    </div>
  );
}

/**
 * The meeting notepad.
 *
 * Owns the single canonical playback timestamp (`currentTime`) that both the
 * player and the transcript read from — see docs/Architecture.md §6 and the
 * "Critical transcript/player architecture" requirement.
 */
export function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { meeting, loading, error, reload, setMeeting } = useMeeting(meetingId);

  // ---- canonical playback state -------------------------------------- #
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mobileTab, setMobileTab] = useState("notes");

  // ---- modal / mutation state ---------------------------------------- #
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [busyActionIds, setBusyActionIds] = useState<string[]>([]);
  const [busyCommentIds, setBusyCommentIds] = useState<string[]>([]);
  const [commentAnchor, setCommentAnchor] = useState<CommentAnchor | null>(null);
  const [commentComposerOpen, setCommentComposerOpen] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const segments = useMemo(() => meeting?.transcript.segments ?? [], [meeting]);
  const duration = useMemo(
    () => transcriptDuration(segments, meeting?.duration_seconds ?? 0),
    [segments, meeting?.duration_seconds],
  );

  // Derived, never stored: the active transcript line follows currentTime.
  const activeIndex = useMemo(() => findActiveSegmentIndex(segments, currentTime), [segments, currentTime]);
  const activeSegment = activeIndex >= 0 ? segments[activeIndex] : null;
  const activeSegmentId = activeSegment?.id ?? null;

  const markers = useMemo(
    () => (meeting?.summary.sections ?? []).map((section) => section.timestamp_seconds ?? 0).filter((value) => value > 0),
    [meeting?.summary.sections],
  );

  // Simulated playback clock.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    if (!playing || duration <= 0) return;
    const timer = window.setInterval(() => {
      setCurrentTime((previous) => {
        const next = previous + (TICK_MS / 1000) * speed;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, speed, duration]);

  const seek = useCallback(
    (seconds: number) => {
      setCurrentTime(clampTime(seconds, duration));
    },
    [duration],
  );

  const seekToSegment = useCallback(
    (segment: { start_seconds: number }) => {
      seek(segment.start_seconds);
    },
    [seek],
  );

  // Reset the clock when switching meetings.
  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [meetingId]);

  // Keyboard shortcuts: space = play/pause, ←/→ = ∓5s.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      // A focused seek bar (role="slider") already handled the arrow key.
      if (event.defaultPrevented || target?.closest('[role="slider"]')) return;
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((current) => !current);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        setCurrentTime((previous) => clampTime(previous + 5, duration));
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        setCurrentTime((previous) => clampTime(previous - 5, duration));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [duration]);

  // ---- mutations ------------------------------------------------------ #
  const applyMeeting = useCallback(
    (updated: MeetingDetail) => {
      setMeeting(updated);
    },
    [setMeeting],
  );

  const renameMeeting = useCallback(
    async (title: string) => {
      try {
        const updated = await api.updateMeeting(meetingId, { title });
        applyMeeting(updated);
        toast.success("Meeting renamed");
      } catch (caught) {
        toast.error("Could not rename the meeting", errorMessage(caught));
      }
    },
    [meetingId, applyMeeting, toast],
  );

  const saveSegment = useCallback(
    async (segmentId: string, text: string) => {
      try {
        const segment = await api.updateSegment(meetingId, segmentId, text);
        setMeeting((current) =>
          current
            ? {
                ...current,
                transcript: {
                  segments: current.transcript.segments.map((item) =>
                    item.id === segmentId ? { ...item, text: segment.text } : item,
                  ),
                },
              }
            : current,
        );
        toast.success("Transcript line updated");
      } catch (caught) {
        toast.error("Could not save the transcript line", errorMessage(caught));
      }
    },
    [meetingId, setMeeting, toast],
  );

  const regenerateSummary = useCallback(async () => {
    setRegenerating(true);
    try {
      const updated = await api.regenerateSummary(meetingId);
      applyMeeting(updated);
      toast.success("AI notes regenerated", "Summarised from the current transcript.");
    } catch (caught) {
      toast.error("Could not regenerate the notes", errorMessage(caught));
    } finally {
      setRegenerating(false);
    }
  }, [meetingId, applyMeeting, toast]);

  const createActionItem = useCallback(
    async (payload: { title: string; assignee?: string | null; due_date?: string | null }) => {
      try {
        const item = await api.addActionItem(meetingId, payload);
        setMeeting((current) =>
          current ? { ...current, action_items: [...current.action_items, item] } : current,
        );
        toast.success("Action item added", item.title);
      } catch (caught) {
        toast.error("Could not add the action item", errorMessage(caught));
        throw caught;
      }
    },
    [meetingId, setMeeting, toast],
  );

  const comments = meeting?.comments ?? [];

  const commentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const comment of comments) {
      if (!comment.segment_id) continue;
      counts[comment.segment_id] = (counts[comment.segment_id] ?? 0) + 1;
    }
    return counts;
  }, [comments]);

  const openCommentComposer = useCallback((anchor: CommentAnchor | null) => {
    setCommentAnchor(anchor);
    setCommentComposerOpen(true);
  }, []);

  const createComment = useCallback(
    async (body: string, anchor: CommentAnchor | null) => {
      if (!meeting) return;
      setSavingComment(true);
      try {
        const created = await api.addComment(meeting.id, {
          body,
          segment_id: anchor?.segmentId ?? null,
        });
        setMeeting((current) => (current ? { ...current, comments: [...current.comments, created] } : current));
        toast.success("Comment added", anchor ? `Highlighted at ${formatDuration(anchor.startSeconds)}` : "Saved to this meeting");
        setCommentComposerOpen(false);
        setCommentAnchor(null);
      } catch (caught) {
        toast.error("Could not add the comment", errorMessage(caught));
      } finally {
        setSavingComment(false);
      }
    },
    [meeting, setMeeting, toast],
  );

  const updateComment = useCallback(
    async (commentId: string, body: string) => {
      setBusyCommentIds((current) => [...current, commentId]);
      try {
        const updated = await api.updateComment(commentId, body);
        setMeeting((current) =>
          current
            ? { ...current, comments: current.comments.map((comment) => (comment.id === commentId ? updated : comment)) }
            : current,
        );
        toast.success("Comment updated");
      } catch (caught) {
        toast.error("Could not update the comment", errorMessage(caught));
        throw caught;
      } finally {
        setBusyCommentIds((current) => current.filter((id) => id !== commentId));
      }
    },
    [setMeeting, toast],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setBusyCommentIds((current) => [...current, commentId]);
      try {
        await api.deleteComment(commentId);
        setMeeting((current) =>
          current ? { ...current, comments: current.comments.filter((comment) => comment.id !== commentId) } : current,
        );
        toast.success("Comment deleted");
      } catch (caught) {
        toast.error("Could not delete the comment", errorMessage(caught));
        throw caught;
      } finally {
        setBusyCommentIds((current) => current.filter((id) => id !== commentId));
      }
    },
    [setMeeting, toast],
  );

  const updateActionItem = useCallback(
    async (itemId: string, payload: { title?: string; assignee?: string | null; due_date?: string | null; completed?: boolean }) => {
      const previous = meeting?.action_items.find((item) => item.id === itemId) ?? null;
      setBusyActionIds((current) => [...current, itemId]);

      // Optimistic update so the checkbox reacts instantly.
      if (previous && payload.completed !== undefined) {
        setMeeting((current) =>
          current
            ? {
                ...current,
                action_items: current.action_items.map((item) =>
                  item.id === itemId ? { ...item, completed: payload.completed as boolean } : item,
                ),
              }
            : current,
        );
      }

      try {
        const updated = await api.updateActionItem(itemId, payload);
        setMeeting((current) =>
          current
            ? {
                ...current,
                action_items: current.action_items.map((item) => (item.id === itemId ? updated : item)),
              }
            : current,
        );
        if (payload.completed !== undefined && previous && previous.completed !== payload.completed) {
          toast.success(payload.completed ? "Action item completed" : "Action item reopened", updated.title);
        } else {
          toast.success("Action item updated", updated.title);
        }
      } catch (caught) {
        if (previous) {
          setMeeting((current) =>
            current
              ? { ...current, action_items: current.action_items.map((item) => (item.id === itemId ? previous : item)) }
              : current,
          );
        }
        toast.error("Could not update the action item", errorMessage(caught));
        throw caught;
      } finally {
        setBusyActionIds((current) => current.filter((id) => id !== itemId));
      }
    },
    [meeting?.action_items, setMeeting, toast],
  );

  const deleteActionItem = useCallback(
    async (itemId: string) => {
      const previous = meeting?.action_items.find((item) => item.id === itemId) ?? null;
      setBusyActionIds((current) => [...current, itemId]);
      try {
        await api.deleteActionItem(itemId);
        setMeeting((current) =>
          current ? { ...current, action_items: current.action_items.filter((item) => item.id !== itemId) } : current,
        );
        toast.success("Action item deleted", previous?.title);
      } catch (caught) {
        toast.error("Could not delete the action item", errorMessage(caught));
        throw caught;
      } finally {
        setBusyActionIds((current) => current.filter((id) => id !== itemId));
      }
    },
    [meeting?.action_items, setMeeting, toast],
  );

  const deleteMeeting = useCallback(async () => {
    setDeleting(true);
    try {
      await api.deleteMeeting(meetingId);
      toast.success("Meeting deleted", "Transcript, notes and action items were removed.");
      window.dispatchEvent(new Event("refresh-stats"));
      router.push("/meetings");
    } catch (caught) {
      toast.error("Could not delete the meeting", errorMessage(caught));
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [meetingId, router, toast]);

  // ---- render -------------------------------------------------------- #
  if (loading && !meeting) return <WorkspaceSkeleton />;

  if (error && !meeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState
          title="Could not load this meeting"
          message={error}
          onRetry={() => void reload({ quiet: false })}
        />
      </div>
    );
  }

  if (!meeting) return null;

  const notesPanel = (
    <SummaryPanel
      meeting={meeting}
      summary={meeting.summary}
      actionItems={meeting.action_items}
      participants={meeting.participants}
      busyActionIds={busyActionIds}
      regenerating={regenerating}
      onSeekToTime={seek}
      onCreateActionItem={createActionItem}
      onUpdateActionItem={updateActionItem}
      onDeleteActionItem={deleteActionItem}
      onRegenerate={regenerateSummary}
      comments={comments}
      busyCommentIds={busyCommentIds}
      onAddComment={() => openCommentComposer(null)}
      onEditComment={updateComment}
      onDeleteComment={deleteComment}
    />
  );

  const transcriptPanel = (
    <TranscriptPanel
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      segments={segments}
      activeSegmentId={activeSegmentId}
      onSeekSegment={seekToSegment}
      onSaveSegment={saveSegment}
      commentCounts={commentCounts}
      onCommentSegment={(segment) =>
        openCommentComposer({
          segmentId: segment.id,
          startSeconds: segment.start_seconds,
          speaker: segment.speaker,
          text: segment.text,
        })
      }
      headerNote={`${meeting.participants.length} participants`}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <MeetingHeaderBar
        meeting={meeting}
        onRename={renameMeeting}
        onEditDetails={() => setSettingsOpen(true)}
        onShare={() => setShareOpen(true)}
        onReplaceTranscript={() => setReplaceOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      {/* Below lg the two panels become tabs; the panels themselves are rendered once. */}
      <div className="note:hidden">
        <Tabs
          items={[
            { id: "notes", label: "AI Notes" },
            { id: "transcript", label: "Transcript" },
          ]}
          active={mobileTab}
          onChange={setMobileTab}
          className="px-3.5 pt-2"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col note:flex-row">
        <div
          className={`${mobileTab === "notes" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col border-r border-border note:flex note:w-[320px] note:flex-none xl:w-[400px]`}
        >
          {notesPanel}
        </div>
        <div
          className={`${mobileTab === "transcript" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col note:flex`}
        >
          {transcriptPanel}
        </div>
      </div>

      <MediaPlayer
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        currentTime={currentTime}
        duration={duration}
        playing={playing}
        speed={speed}
        activeSegment={activeSegment}
        markers={markers}
        onSeek={seek}
        onTogglePlay={() => setPlaying((current) => !current)}
        onSpeedChange={setSpeed}
      />

      <CommentComposer
        open={commentComposerOpen}
        anchor={commentAnchor}
        saving={savingComment}
        onClose={() => {
          setCommentComposerOpen(false);
          setCommentAnchor(null);
        }}
        onSubmit={createComment}
      />

      <ShareModal meeting={meeting} open={shareOpen} onClose={() => setShareOpen(false)} />
      <MeetingSettingsModal
        meeting={meeting}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(updated) => {
          applyMeeting(updated);
        }}
      />
      <ReplaceTranscriptModal
        meeting={meeting}
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        onReplaced={(updated) => {
          applyMeeting(updated);
          setCurrentTime(0);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete this meeting?"
        message={`“${meeting.title}” and its transcript, AI notes and action items will be permanently deleted.`}
        confirmLabel="Delete meeting"
        destructive
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteMeeting()}
      />
    </div>
  );
}
