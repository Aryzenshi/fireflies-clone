"use client";

import { useRef, useState } from "react";

import { FileTextIcon, UploadIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";

/**
 * Replace or add a transcript for an existing meeting.
 *
 * Pasted text goes through `POST /api/meetings/{id}/transcript`, which re-parses
 * the transcript and regenerates the AI notes.
 */
export function ReplaceTranscriptModal({
  meeting,
  open,
  onClose,
  onReplaced,
}: {
  meeting: MeetingDetail;
  open: boolean;
  onClose: () => void;
  onReplaced: (updated: MeetingDetail) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) {
      setError("Paste the replacement transcript before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.replaceTranscript(meeting.id, text);
      onReplaced(updated);
      toast.success("Transcript replaced", `AI notes regenerated from ${updated.transcript.segments.length} segments.`);
      setText("");
      onClose();
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error("Could not replace the transcript", message);
    } finally {
      setSaving(false);
    }
  };

  const loadFile = async (file: File) => {
    try {
      const content = await file.text();
      setText(content);
      setError(null);
    } catch {
      setError("Could not read that file. Paste the transcript instead.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Replace transcript"
      subtitle="TXT, VTT or JSON content. The AI notes are regenerated from the new transcript."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            Replace &amp; regenerate
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Transcript content" htmlFor="replace-transcript">
          <Textarea
            id="replace-transcript"
            rows={10}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"00:00 Maya Chen: Welcome everyone..."}
            className="font-mono text-[12.5px]"
          />
        </Field>
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-muted">
          <span>Current transcript has {meeting.transcript.segments.length} segments.</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <FileTextIcon size={12} /> Load from file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.vtt,.json,text/plain,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
            }}
          />
        </div>
        {error ? (
          <p className="rounded-[9px] border border-[#f6d3d7] bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}
        <p className="flex items-start gap-2 rounded-[9px] bg-surface px-3 py-2 text-[11.5px] text-muted">
          <UploadIcon size={14} className="mt-[1px] shrink-0" />
          Supported formats: <code className="mx-1 rounded bg-white px-1">00:12 Speaker: text</code>, WebVTT cues, or a
          JSON array of {"{speaker, start, end, text}"} objects.
        </p>
      </div>
    </Modal>
  );
}
