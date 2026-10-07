"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDuration } from "@/lib/format";

export interface CommentAnchor {
  segmentId: string;
  startSeconds: number;
  speaker: string;
  text: string;
}

/**
 * Composer modal shared by the "Add comment" button in the notes panel and the
 * per-line comment action in the transcript. Passing an anchor pre-fills the
 * quoted line so the comment reads as a highlight on that timestamp.
 */
export function CommentComposer({
  open,
  anchor,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  anchor: CommentAnchor | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (body: string, anchor: CommentAnchor | null) => Promise<void> | void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBody("");
      setError(null);
    }
  }, [open]);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write something before saving the comment.");
      return;
    }
    void onSubmit(trimmed, anchor);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={anchor ? "Comment on this line" : "Add a comment"}
      subtitle={anchor ? `${anchor.speaker} · ${formatDuration(anchor.startSeconds)}` : "Notes for this meeting"}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {anchor ? "Save comment" : "Add comment"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {anchor ? (
          <blockquote className="rounded-[9px] border-l-2 border-primary bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-ink-soft">
            {anchor.text}
          </blockquote>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-[12px] font-medium text-ink-soft">Comment</span>
          <textarea
            autoFocus
            value={body}
            rows={4}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
            placeholder={
              anchor ? "What should the team notice about this line?" : "What should the team remember from this meeting?"
            }
            className="w-full resize-y rounded-[9px] border border-border bg-white px-2.5 py-2 text-[13px] leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/12"
          />
        </label>

        {error ? <p className="text-[12px] text-danger">{error}</p> : null}
        <p className="text-[11px] text-muted">
          Comments are stored with the meeting; anchored comments jump the player to their timestamp.
        </p>
      </div>
    </Modal>
  );
}
