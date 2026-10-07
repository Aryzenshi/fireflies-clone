"use client";

import { useEffect, useState } from "react";

import { ChatIcon, CheckIcon, CloseIcon, EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/States";
import { formatDuration } from "@/lib/format";
import type { Comment } from "@/lib/types";

function timestampLabel(comment: Comment): string {
  if (comment.anchor_start_seconds === null) return "Meeting note";
  return formatDuration(comment.anchor_start_seconds);
}

/**
 * Comment thread for a meeting, rendered at the bottom of the notes panel.
 *
 * Anchored comments show their timestamp as a button that seeks the shared player,
 * which is what makes them act as highlights on the transcript.
 */
export function CommentsPanel({
  comments,
  busyCommentIds,
  onSeekToTime,
  onEdit,
  onDelete,
  onAdd,
}: {
  comments: Comment[];
  busyCommentIds: string[];
  onSeekToTime: (seconds: number) => void;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onAdd: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep the inline editor in sync when the underlying comment changes.
  useEffect(() => {
    if (!editingId) return;
    const current = comments.find((comment) => comment.id === editingId);
    if (!current) {
      setEditingId(null);
      return;
    }
    setDraft(current.body);
  }, [comments, editingId]);

  const saveEdit = async () => {
    if (!editingId) return;
    const next = draft.trim();
    if (!next) return;
    setSaving(true);
    try {
      await onEdit(editingId, next);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Comments" className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">
          Comments {comments.length > 0 ? <span className="text-muted-soft">({comments.length})</span> : null}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-[26px] items-center gap-1 rounded-[7px] px-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary-soft"
        >
          <PlusIcon size={12} />
          Add comment
        </button>
      </div>

      {comments.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={18} />}
          title="No comments yet"
          description="Comment on the meeting, or hover a transcript line to highlight it with a comment."
          className="rounded-[10px] border border-dashed border-border py-6"
        />
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const busy = busyCommentIds.includes(comment.id);
            return (
              <li
                key={comment.id}
                data-comment-id={comment.id}
                className="rounded-[10px] border border-border bg-white p-2.5"
              >
                <div className="flex items-start gap-2">
                  <Avatar name={comment.author_name} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-ink">{comment.author_name}</span>
                      {comment.anchor_start_seconds !== null && comment.segment_id ? (
                        <button
                          type="button"
                          onClick={() => onSeekToTime(comment.anchor_start_seconds as number)}
                          aria-label={`Play from ${timestampLabel(comment)}`}
                          className="shrink-0 rounded-full border border-primary-border bg-primary-soft px-2 py-[1px] font-mono text-[10.5px] text-primary-hover transition-colors hover:border-primary"
                        >
                          {timestampLabel(comment)}
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-[1px] text-[10.5px] text-muted">
                          {timestampLabel(comment)}
                        </span>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-1.5 space-y-1.5">
                        <textarea
                          value={draft}
                          rows={3}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setEditingId(null);
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void saveEdit();
                          }}
                          className="w-full resize-y rounded-[8px] border border-primary-border bg-white px-2 py-1.5 text-[12.5px] leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
                            disabled={saving}
                            className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-primary px-2.5 text-[11.5px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                          >
                            <CheckIcon size={12} />
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-border px-2.5 text-[11.5px] text-ink-soft transition-colors hover:bg-surface"
                          >
                            <CloseIcon size={12} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink">
                          {comment.body}
                        </p>
                        {comment.anchor_text ? (
                          <p className="mt-1 line-clamp-2 border-l-2 border-border pl-2 text-[11.5px] italic text-muted">
                            {comment.anchor_text}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  {editingId === comment.id ? null : (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(comment.id)}
                        disabled={busy}
                        aria-label={`Edit comment by ${comment.author_name}`}
                        className="rounded-md p-1 text-muted-soft transition-colors hover:bg-surface-muted hover:text-primary disabled:opacity-50"
                      >
                        <EditIcon size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(comment)}
                        disabled={busy}
                        aria-label={`Delete comment by ${comment.author_name}`}
                        className="rounded-md p-1 text-muted-soft transition-colors hover:bg-surface-muted hover:text-danger disabled:opacity-50"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this comment?"
        message={
          deleteTarget && deleteTarget.anchor_start_seconds !== null
            ? `The comment on ${timestampLabel(deleteTarget)} will be removed from this meeting.`
            : "The comment will be removed from this meeting."
        }
        confirmLabel="Delete comment"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleting(true);
          void onDelete(deleteTarget.id).finally(() => {
            setDeleting(false);
            setDeleteTarget(null);
          });
        }}
      />
    </section>
  );
}
