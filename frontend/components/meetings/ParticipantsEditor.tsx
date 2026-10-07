"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, PlusIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/api";

/**
 * Chip-style participants editor used by the create, settings and import flows.
 * Values are plain display names, matching the API contract.
 */
export function ParticipantsEditor({
  value,
  onChange,
  placeholder = "Type a name and press Enter",
  id = "participants-editor",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listParticipants()
      .then((participants) => {
        if (active) setSuggestions(participants.map((participant) => participant.name));
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = (raw: string) => {
    const name = raw.trim().replace(/,$/, "");
    if (!name) return;
    if (value.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, name]);
    setDraft("");
  };

  const remove = (name: string) => onChange(value.filter((existing) => existing !== name));

  const unusedSuggestions = suggestions.filter(
    (name) => !value.some((existing) => existing.toLowerCase() === name.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[38px] cursor-text flex-wrap items-center gap-1.5 rounded-[9px] border border-border bg-white p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/12"
      >
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-[3px] pl-[3px] pr-2 text-[12px] text-ink-soft"
          >
            <Avatar name={name} size={18} />
            {name}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(name);
              }}
              aria-label={`Remove ${name}`}
              className="rounded-full text-muted transition-colors hover:text-danger"
            >
              <CloseIcon size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="h-6 min-w-[120px] flex-1 bg-transparent px-1 text-[13px] outline-none"
        />
      </div>

      {unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">Recently in your workspace:</span>
          {unusedSuggestions.slice(0, 5).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-[2px] text-[11px] text-muted transition-colors hover:border-primary-border hover:text-primary-hover"
            >
              <PlusIcon size={10} />
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
