"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { FileTextIcon, HelpIcon, UploadIcon } from "@/components/icons";
import { ParticipantsEditor } from "@/components/meetings/ParticipantsEditor";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import { toDateTimeLocalValue } from "@/lib/format";

const EXAMPLE_TRANSCRIPT = `[00:00] Priya Raghunathan: Thanks for making time. Can you walk me through the follow-up process today?
[00:22] Grace Lindqvist: It is a spreadsheet. Someone re-listens to the recording and types the commitments into the CRM.
[00:51] Marcus Bell: We run about sixty customer calls a month, so that becomes a part-time job.
[01:14] Priya Raghunathan: What would make that easier for the team?
[01:26] Grace Lindqvist: Searchable transcripts, and action items we can assign in the same place.
[01:52] Priya Raghunathan: I'll send a pilot proposal this week and map your CRM fields to our action item schema.
[02:16] Marcus Bell: Please include the retention documentation, security will ask for it.`;

const ACCEPTED = ".txt,.vtt,.json,text/plain,application/json";

export function UploadWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState("file");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [participants, setParticipants] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (candidate: File | null) => {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "vtt", "json"].includes(extension)) {
      setError(`Unsupported file type “.${extension}”. Upload a TXT, VTT or JSON transcript.`);
      return;
    }
    setFile(candidate);
    setError(null);
    if (!title.trim()) {
      setTitle(candidate.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    }
  };

  const submit = async () => {
    if (mode === "file" && !file) {
      setError("Choose a transcript file first.");
      return;
    }
    if (mode === "paste" && !transcript.trim()) {
      setError("Paste a transcript before generating the meeting.");
      return;
    }
    if (!title.trim()) {
      setError("Give the meeting a title so it is easy to find later.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const iso = startedAt ? new Date(startedAt).toISOString() : undefined;
      const created =
        mode === "file" && file
          ? await api.importMeeting(file, {
              title: title.trim(),
              participants: participants.join(","),
              started_at: iso,
            })
          : await api.createMeeting({
              title: title.trim(),
              participants,
              started_at: iso,
              transcript_text: transcript,
            });

      toast.success(
        "Transcript imported",
        `${created.transcript.segments.length} segments parsed and AI notes generated.`,
      );
      router.push(`/meetings/${created.id}`);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error("Could not create the meeting", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-white">
      <div className="relative mx-auto w-full max-w-[980px] px-5 pb-8 pt-7">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F6F7FF] text-primary">
          <UploadIcon size={24} />
        </span>
        <h1 className="mt-4 max-w-[760px] text-[23px] font-semibold leading-tight text-ink sm:text-[26px]">
          Upload a transcript file to generate AI notes
        </h1>
        <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-muted">
          Real audio/video transcription is out of scope for this assignment, so the app works from transcript text:
          everything is processed locally and notes appear in seconds.
        </p>
      </div>

      <div className="mx-auto mt-5 w-full">
        <div className="mb-3 flex justify-center">
          <Tabs
            items={[
              { id: "file", label: "Upload file" },
              { id: "paste", label: "Paste transcript" },
            ]}
            active={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
          />
        </div>

        {mode === "file" ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed bg-[#FAFAFA] px-6 py-10 transition-colors ${
              dragging ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-white text-primary shadow-panel">
                  <FileTextIcon size={20} />
                </span>
                <p className="text-[14px] font-medium text-ink">{file.name}</p>
                <p className="text-[12px] text-muted">{(file.size / 1024).toFixed(1)} KB · ready to import</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <>
                <p className="text-[13.5px] text-ink-soft">
                  Drag and drop{" "}
                  <strong className="font-semibold text-primary">TXT</strong>,{" "}
                  <strong className="font-semibold text-primary">VTT</strong> or{" "}
                  <strong className="font-semibold text-primary">JSON</strong> file here, or select files to upload.
                </p>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Select file
                </Button>
                <p className="text-[11.5px] text-muted">
                  Timestamps are optional. Lines like <code className="rounded bg-white px-1">00:12 Speaker: text</code>{" "}
                  keep playback in sync.
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={12}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder={"00:00 Maya Chen: Welcome everyone...\n00:18 Daniel Okafor: Let's review the release plan."}
              className="bg-[#FAFAFA] font-mono text-[12.5px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
              <span>Line formats: “00:12 Speaker: text”, “Speaker: text”, or WebVTT cues.</span>
              <button
                type="button"
                onClick={() => setTranscript(EXAMPLE_TRANSCRIPT)}
                className="font-medium text-primary hover:underline"
              >
                Load an example transcript
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 rounded-[12px] border border-border bg-white p-4">
          <h2 className="text-[13px] font-semibold text-ink">Meeting details</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            These values are stored in SQLite and used by the library filters.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Meeting title" htmlFor="upload-title" required>
              <Input
                id="upload-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Customer Discovery Call"
              />
            </Field>
            <Field label="Date & time" htmlFor="upload-start">
              <Input
                id="upload-start"
                type="datetime-local"
                value={startedAt}
                onChange={(event) => setStartedAt(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field
              label="Participants"
              htmlFor="upload-participants"
              hint="Leave empty to use the speakers found in the transcript."
            >
              <ParticipantsEditor value={participants} onChange={setParticipants} id="upload-participants" />
            </Field>
          </div>

          {error ? (
            <p className="mt-3 rounded-[9px] border border-[#f6d3d7] bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => router.push("/meetings")} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submit()} loading={busy} icon={<UploadIcon size={14} />}>
              Generate transcript &amp; notes
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          toast.info(
            "Upload help",
            "Supported inputs: TXT, VTT, JSON transcripts plus pasted text. Audio/video transcription is out of scope.",
          )
        }
        aria-label="Upload help"
        className="fixed bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-muted shadow-panel transition-colors hover:text-ink"
      >
        <HelpIcon size={17} />
      </button>
      </div>
    </div>
  );
}
