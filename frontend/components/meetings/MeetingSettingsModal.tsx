"use client";

import { useEffect, useState } from "react";

import { ParticipantsEditor } from "@/components/meetings/ParticipantsEditor";
import { TagsEditor } from "@/components/meetings/TagsEditor";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import { toDateTimeLocalValue } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

/**
 * Edit meeting metadata (title, date, host, participants) — PATCH /api/meetings/{id}.
 */
export function MeetingSettingsModal({
  meeting,
  open,
  onClose,
  onSaved,
}: {
  meeting: MeetingDetail | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: MeetingDetail) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [hostName, setHostName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meeting || !open) return;
    setTitle(meeting.title);
    setStartedAt(toDateTimeLocalValue(meeting.started_at));
    setHostName(meeting.host_name ?? "");
    setParticipants(meeting.participants.map((participant) => participant.name));
    setTags(meeting.tags ?? []);
    setError(null);
  }, [meeting, open]);

  const save = async () => {
    if (!meeting) return;
    if (!title.trim()) {
      setError("A meeting title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateMeeting(meeting.id, {
        title: title.trim(),
        started_at: startedAt ? new Date(startedAt).toISOString() : undefined,
        host_name: hostName.trim() || undefined,
        participants,
        tags,
      });
      onSaved(updated);
      toast.success("Meeting updated", "Title, date, participants and tags saved.");
      onClose();
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      toast.error("Could not save changes", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meeting details"
      subtitle={meeting ? "Update the metadata stored with this meeting" : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Meeting title" htmlFor="settings-title" required>
          <Input id="settings-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date & time" htmlFor="settings-start">
            <Input
              id="settings-start"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </Field>
          <Field label="Host" htmlFor="settings-host">
            <Input id="settings-host" value={hostName} onChange={(event) => setHostName(event.target.value)} />
          </Field>
        </div>
        <Field
          label="Participants"
          htmlFor="settings-participants"
          hint="Removing a participant keeps their transcript lines intact."
        >
          <ParticipantsEditor value={participants} onChange={setParticipants} id="settings-participants" />
        </Field>

        <Field
          label="Tags"
          hint="Used to group and filter meetings in the library."
          htmlFor="settings-tags"
        >
          <TagsEditor value={tags} onChange={setTags} id="settings-tags" />
        </Field>
        {error ? (
          <p className="rounded-[9px] border border-[#f6d3d7] bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
