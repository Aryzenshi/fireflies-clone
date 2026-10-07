"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, PlusIcon, TagIcon } from "@/components/icons";
import { api } from "@/lib/api";

/**
 * Chip editor for meeting tags.
 *
 * Mirrors the interaction of `ParticipantsEditor` (Enter or comma commits,
 * Backspace removes the last chip, clicking a suggestion adds it) but tags have
 * no avatar and offer the workspace tag directory as suggestions instead of people.
 */
export function TagsEditor({
  value,
  onChange,
  placeholder = "Add a tag and press Enter",
  id = "tags-editor",
  maxTags = 12,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  maxTags?: number;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listTags()
      .then((tags) => {
        if (active) setSuggestions(tags.map((tag) => tag.name));
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    if (value.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(value.filter((existing) => existing !== tag));

  const unusedSuggestions = suggestions.filter(
    (tag) => !value.some((existing) => existing.toLowerCase() === tag.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[38px] cursor-text flex-wrap items-center gap-1.5 rounded-[9px] border border-border bg-white p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/12"
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft py-[3px] pl-2.5 pr-1.5 text-[12px] text-primary-hover"
          >
            {tag}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                remove(tag);
              }}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full text-primary/70 transition-colors hover:text-danger"
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
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <TagIcon size={11} />
            Tags in use:
          </span>
          {unusedSuggestions.slice(0, 6).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-[2px] text-[11px] text-muted transition-colors hover:border-primary-border hover:text-primary-hover"
            >
              <PlusIcon size={10} />
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
