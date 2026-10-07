"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { FileTextIcon, UploadIcon } from "@/components/icons";
import { ParticipantsEditor } from "@/components/meetings/ParticipantsEditor";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import { toDateTimeLocalValue } from "@/lib/format";

const EXAMPLE_TRANSCRIPT = `[00:00] Maya Chen: Let's review the onboarding numbers before the release call.
[00:18] Daniel Okafor: Trial activation is up 6 points, but the invite step still drops people.
[00:47] Maya Chen: I'll instrument each onboarding step by Friday.
[01:05] Daniel Okafor: Please add the mobile crash to the release checklist.
[01:31] Maya Chen: Agreed, we should also send the updated digest copy to support.`;

export function MeetingCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState("paste");
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [participants, setParticipants] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setStartedAt(toDateTimeLocalValue(new Date()));
    setParticipants([]);
    setTranscript("");
    setFile(null);
    setError(null);
    setMode("paste");
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("A meeting title is required.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Choose a TXT, VTT or JSON transcript file to import.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isoStartedAt = startedAt ? new Date(startedAt).toISOString() : undefined;
      const created =
        mode === "file" && file
          ? await api.importMeeting(file, {
              title: title.trim(),
              participants: participants.join(","),
              started_at: isoStartedAt,
            })
          : await api.createMeeting({
              title: title.trim(),
              participants,
              started_at: isoStartedAt,
              transcript_text: transcript.trim() ? transcript : null,
            });
      toast.success("Meeting created", created.title);
      onCreated?.();
      reset();
      router.push(`/meetings/${created.id}`);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error("Could not create the meeting", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New meeting"
      subtitle="Create a meeting from a pasted transcript or import a transcript file"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} data-autofocus>
            Create meeting
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Meeting title" htmlFor="create-title" required>
            <Input
              id="create-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Weekly Product Sync"
              autoComplete="off"
            />
          </Field>
          <Field label="Date & time" htmlFor="create-start" hint="Defaults to now — used for recency sorting.">
            <Input
              id="create-start"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Participants"
          htmlFor="create-participants"
          hint="Names only — the same person is reused across meetings."
        >
          <ParticipantsEditor value={participants} onChange={setParticipants} id="create-participants" />
        </Field>

        <div>
          <Tabs
            items={[
              { id: "paste", label: "Paste transcript" },
              { id: "file", label: "Upload file" },
            ]}
            active={mode}
            onChange={setMode}
            className="mb-3"
          />
          {mode === "paste" ? (
            <div className="space-y-2">
              <Textarea
                id="create-transcript"
                aria-label="Transcript content"
                rows={9}
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder={"00:00 Maya Chen: Welcome everyone...\n00:18 Daniel Okafor: Let's review the release plan."}
                className="font-mono text-[12.5px]"
              />
              <div className="flex items-center justify-between text-[11.5px] text-muted">
                <span>
                  Supported lines: <code className="rounded bg-surface-muted px-1">00:12 Speaker: text</code> or plain{" "}
                  <code className="rounded bg-surface-muted px-1">Speaker: text</code>.
                </span>
                <button
                  type="button"
                  onClick={() => setTranscript(EXAMPLE_TRANSCRIPT)}
                  className="font-medium text-primary hover:underline"
                >
                  Load example transcript
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-4 py-8 text-center transition-colors ${
                dragging ? "border-primary bg-primary-soft" : "border-border-strong bg-surface"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-panel">
                <UploadIcon size={18} />
              </span>
              <p className="text-[13px] text-ink-soft">
                {file ? (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <FileTextIcon size={14} /> {file.name}
                  </span>
                ) : (
                  <>Drag and drop a TXT, VTT or JSON file, or pick one from disk.</>
                )}
              </p>
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Select file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.vtt,.json,text/plain,application/json"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        {error ? (
          <p className="rounded-[9px] border border-[#f6d3d7] bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
