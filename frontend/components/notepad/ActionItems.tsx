"use client";

import { useState } from "react";

import { CheckIcon, EditIcon, PlusIcon, SparklesIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { formatDueDate, isOverdue } from "@/lib/format";
import type { ActionItem, ActionItemInput, ActionItemPatch, Participant } from "@/lib/types";

interface EditorState {
  mode: "create" | "edit";
  itemId?: string;
  title: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

const EMPTY_EDITOR: EditorState = {
  mode: "create",
  title: "",
  assignee: "",
  dueDate: "",
  completed: false,
};

function ActionItemEditor({
  state,
  participants,
  saving,
  onClose,
  onSubmit,
}: {
  state: EditorState;
  participants: Participant[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: ActionItemInput & ActionItemPatch) => void;
}) {
  const [draft, setDraft] = useState(state);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!draft.title.trim()) {
      setError("Describe the task before saving.");
      return;
    }
    onSubmit({
      title: draft.title.trim(),
      assignee: draft.assignee.trim() || null,
      due_date: draft.dueDate || null,
      ...(draft.mode === "edit" ? { completed: draft.completed } : {}),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={draft.mode === "create" ? "Add action item" : "Edit action item"}
      subtitle="Action items are stored per meeting and survive a page refresh."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} data-autofocus>
            {draft.mode === "create" ? "Create item" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Task" htmlFor="action-title" required error={error}>
          <Input
            id="action-title"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="e.g. Send the revised mockups"
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assignee" htmlFor="action-assignee" hint="Pick a participant or type a name.">
            <Input
              id="action-assignee"
              list="action-assignee-options"
              value={draft.assignee}
              onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}
              placeholder="Unassigned"
            />
            <datalist id="action-assignee-options">
              {participants.map((participant) => (
                <option key={participant.id} value={participant.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Due date" htmlFor="action-due">
            <Input
              id="action-due"
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </Field>
        </div>
        {draft.mode === "edit" ? (
          <Checkbox
            id="action-completed"
            checked={draft.completed}
            onChange={(completed) => setDraft((current) => ({ ...current, completed }))}
            label="Mark as completed"
          />
        ) : null}
      </div>
    </Modal>
  );
}

export interface ActionItemsProps {
  items: ActionItem[];
  participants: Participant[];
  busyIds: string[];
  onCreate: (payload: ActionItemInput) => Promise<void>;
  onUpdate: (itemId: string, payload: ActionItemPatch) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

export function ActionItems({ items, participants, busyIds, onCreate, onUpdate, onDelete }: ActionItemsProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ActionItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const completed = items.filter((item) => item.completed).length;

  const submitEditor = async (payload: ActionItemInput & ActionItemPatch) => {
    setSaving(true);
    try {
      if (editor?.mode === "edit" && editor.itemId) {
        await onUpdate(editor.itemId, payload);
      } else {
        await onCreate(payload as ActionItemInput);
      }
      setEditor(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">Action items</h3>
          <span className="text-[11px] text-muted">
            {completed}/{items.length} complete
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ ...EMPTY_EDITOR })}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-medium text-primary transition-colors hover:bg-primary-soft"
        >
          <PlusIcon size={12} />
          Add item
        </button>
      </div>

      {items.length > 0 ? (
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${items.length ? (completed / items.length) * 100 : 0}%` }}
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border bg-surface px-3 py-3 text-[12px] text-muted">
          No action items yet. Add one manually, or re-import a transcript so the AI notes extract them for you.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const busy = busyIds.includes(item.id);
            const due = formatDueDate(item.due_date);
            const overdue = !item.completed && isOverdue(item.due_date);
            return (
              <li
                key={item.id}
                className="group flex items-start gap-2.5 rounded-[9px] px-2 py-1.5 transition-colors hover:bg-surface"
              >
                <span className="pt-[3px]">
                  <Checkbox
                    id={`action-${item.id}`}
                    ariaLabel={`${item.completed ? "Reopen" : "Complete"} ${item.title}`}
                    checked={item.completed}
                    disabled={busy}
                    onChange={(next) => void onUpdate(item.id, { completed: next })}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] leading-snug ${
                      item.completed ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {item.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                    {item.assignee ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="h-[5px] w-[5px] rounded-full bg-primary" />
                        {item.assignee}
                      </span>
                    ) : (
                      <span className="text-muted-soft">Unassigned</span>
                    )}
                    {due ? (
                      <span className={overdue ? "font-medium text-danger" : ""}>
                        · {due}
                        {overdue ? " · overdue" : ""}
                      </span>
                    ) : null}
                    {item.completed ? <span className="text-success">· Done</span> : null}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        mode: "edit",
                        itemId: item.id,
                        title: item.title,
                        assignee: item.assignee ?? "",
                        dueDate: item.due_date ?? "",
                        completed: item.completed,
                      })
                    }
                    aria-label={`Edit ${item.title}`}
                    className="rounded-md p-1 text-muted transition-colors hover:bg-white hover:text-primary"
                  >
                    <EditIcon size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(item)}
                    aria-label={`Delete ${item.title}`}
                    className="rounded-md p-1 text-muted transition-colors hover:bg-white hover:text-danger"
                  >
                    <TrashIcon size={13} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && completed === items.length ? (
        <p className="inline-flex items-center gap-1.5 rounded-[8px] bg-success-soft px-2 py-1 text-[11.5px] text-success">
          <CheckIcon size={12} />
          Everything from this meeting is done.
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <SparklesIcon size={12} className="text-primary" />
          Extracted automatically from the transcript, editable at any time.
        </p>
      )}

      {editor ? (
        <ActionItemEditor
          state={editor}
          participants={participants}
          saving={saving}
          onClose={() => setEditor(null)}
          onSubmit={submitEditor}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete action item"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed from this meeting.` : ""}
        confirmLabel="Delete item"
        destructive
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          setDeleting(true);
          try {
            await onDelete(pendingDelete.id);
            setPendingDelete(null);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
