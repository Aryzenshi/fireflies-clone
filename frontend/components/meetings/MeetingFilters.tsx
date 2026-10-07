"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  FilterIcon,
  SearchIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { ParticipantSummary, TagSummary } from "@/lib/types";

export type DatePreset = "any" | "today" | "7d" | "30d" | "custom";

export interface LibraryFilters {
  q: string;
  participant: string;
  tag: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  sort: "recent" | "oldest";
}

export const DEFAULT_FILTERS: LibraryFilters = {
  q: "",
  participant: "",
  tag: "",
  datePreset: "any",
  dateFrom: "",
  dateTo: "",
  sort: "recent",
};

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  any: "Any time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Turn the UI date preset into API `date_from` / `date_to` values. */
export function resolveDateRange(filters: LibraryFilters): { date_from?: string; date_to?: string } {
  const shift = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  };
  switch (filters.datePreset) {
    case "today":
      return { date_from: todayIso(), date_to: todayIso() };
    case "7d":
      return { date_from: shift(6), date_to: todayIso() };
    case "30d":
      return { date_from: shift(29), date_to: todayIso() };
    case "custom":
      return {
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
      };
    default:
      return {};
  }
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.participant !== "" ||
    filters.tag !== "" ||
    filters.datePreset !== "any" ||
    filters.sort !== "recent"
  );
}

/* ------------------------------------------------------------------ */
/* Participant picker                                                 */
/* ------------------------------------------------------------------ */

function ParticipantPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || participants.length > 0) return;
    api
      .listParticipants()
      .then(setParticipants)
      .catch(() => setParticipants([]));
  }, [open, participants.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return participants;
    return participants.filter((participant) => participant.name.toLowerCase().includes(needle));
  }, [participants, term]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] transition-colors ${
          value ? "border-primary-border bg-primary-soft text-primary-hover" : "border-border bg-white text-ink-soft hover:bg-surface"
        }`}
      >
        <UsersIcon size={14} />
        <span className="max-w-[130px] truncate">{value || "All participants"}</span>
        <ChevronDownIcon size={13} className="text-muted" />
      </button>

      {open ? (
        <div className="animate-pop-in absolute left-0 z-40 mt-1 w-[248px] rounded-[10px] border border-border bg-white p-2 shadow-pop">
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Filter participants"
            icon={<SearchIcon size={13} />}
            className="[&_input]:h-8"
          />
          <div className="scroll-area mt-1.5 max-h-[240px]">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
            >
              All participants
              {value === "" ? <CheckIcon size={13} className="text-primary" /> : null}
            </button>
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-muted">No participants found.</p>
            ) : (
              filtered.map((participant) => (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => {
                    onChange(participant.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
                >
                  <span className="min-w-0 truncate">{participant.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    {participant.meeting_count}
                    {value === participant.name ? <CheckIcon size={13} className="text-primary" /> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag picker                                                         */
/* ------------------------------------------------------------------ */

function TagPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || tags.length > 0) return;
    api
      .listTags()
      .then(setTags)
      .catch(() => setTags([]));
  }, [open, tags.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // The active tag stays visible even if it is not in the (lazily loaded) directory.
  const options = tags.some((tag) => tag.name.toLowerCase() === value.toLowerCase())
    ? tags
    : value
      ? [{ name: value, meeting_count: 0 }, ...tags]
      : tags;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filter by tag"
        className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] transition-colors ${
          value ? "border-primary-border bg-primary-soft text-primary-hover" : "border-border bg-white text-ink-soft hover:bg-surface"
        }`}
      >
        <TagIcon size={14} />
        <span className="max-w-[130px] truncate">{value || "All tags"}</span>
        <ChevronDownIcon size={13} className="text-muted" />
      </button>

      {open ? (
        <div className="animate-pop-in absolute left-0 z-40 mt-1 w-[248px] rounded-[10px] border border-border bg-white p-2 shadow-pop">
          <div className="scroll-area max-h-[240px]">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
            >
              All tags
              {value === "" ? <CheckIcon size={13} className="text-primary" /> : null}
            </button>
            {options.length === 0 ? (
              <p className="px-2 py-2 text-[12px] text-muted">No tags yet — add one from a meeting&apos;s details.</p>
            ) : (
              options.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  onClick={() => {
                    onChange(tag.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
                >
                  <span className="min-w-0 truncate">{tag.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    {tag.meeting_count}
                    {value.toLowerCase() === tag.name.toLowerCase() ? (
                      <CheckIcon size={13} className="text-primary" />
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Date + sort pickers                                                */
/* ------------------------------------------------------------------ */

function DatePicker({
  filters,
  onChange,
}: {
  filters: LibraryFilters;
  onChange: (next: Partial<LibraryFilters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const presets: DatePreset[] = ["any", "today", "7d", "30d", "custom"];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] transition-colors ${
          filters.datePreset !== "any"
            ? "border-primary-border bg-primary-soft text-primary-hover"
            : "border-border bg-white text-ink-soft hover:bg-surface"
        }`}
      >
        <CalendarIcon size={14} />
        <span>{DATE_PRESET_LABELS[filters.datePreset]}</span>
        <ChevronDownIcon size={13} className="text-muted" />
      </button>

      {open ? (
        <div className="animate-pop-in absolute left-0 z-40 mt-1 w-[236px] rounded-[10px] border border-border bg-white p-2 shadow-pop">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange({ datePreset: preset, dateFrom: "", dateTo: "" })}
              className="flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
            >
              {DATE_PRESET_LABELS[preset]}
              {filters.datePreset === preset ? <CheckIcon size={13} className="text-primary" /> : null}
            </button>
          ))}
          {filters.datePreset === "custom" ? (
            <div className="mt-2 space-y-2 border-t border-border px-2 pb-1 pt-2">
              <label className="block text-[11px] text-muted">
                From
                <input
                  type="date"
                  value={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  onChange={(event) => onChange({ dateFrom: event.target.value })}
                  className="mt-1 h-8 w-full rounded-[8px] border border-border px-2 text-[12.5px] focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block text-[11px] text-muted">
                To
                <input
                  type="date"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={(event) => onChange({ dateTo: event.target.value })}
                  className="mt-1 h-8 w-full rounded-[8px] border border-border px-2 text-[12.5px] focus:border-primary focus:outline-none"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SortPicker({
  value,
  onChange,
}: {
  value: "recent" | "oldest";
  onChange: (next: "recent" | "oldest") => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-white px-3 text-[12.5px] text-ink-soft transition-colors hover:bg-surface"
      >
        <FilterIcon size={14} />
        <span>{value === "recent" ? "Recent first" : "Oldest first"}</span>
        <ChevronDownIcon size={13} className="text-muted" />
      </button>
      {open ? (
        <div className="animate-pop-in absolute right-0 z-40 mt-1 w-[176px] rounded-[10px] border border-border bg-white p-2 shadow-pop">
          {(["recent", "oldest"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-ink-soft hover:bg-surface-muted"
            >
              {option === "recent" ? "Recent first" : "Oldest first"}
              {value === option ? <CheckIcon size={13} className="text-primary" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar                                                         */
/* ------------------------------------------------------------------ */

export function MeetingFilters({
  filters,
  onChange,
  onReset,
  onCreate,
  resultCount,
  total,
}: {
  filters: LibraryFilters;
  onChange: (next: Partial<LibraryFilters>) => void;
  onReset: () => void;
  onCreate: () => void;
  resultCount: number;
  total: number;
}) {
  const chips: { id: string; label: string; clear: () => void }[] = [];
  if (filters.q.trim()) chips.push({ id: "q", label: `“${filters.q.trim()}”`, clear: () => onChange({ q: "" }) });
  if (filters.participant)
    chips.push({ id: "participant", label: filters.participant, clear: () => onChange({ participant: "" }) });
  if (filters.tag) chips.push({ id: "tag", label: `#${filters.tag}`, clear: () => onChange({ tag: "" }) });
  if (filters.datePreset !== "any")
    chips.push({
      id: "date",
      label:
        filters.datePreset === "custom" && (filters.dateFrom || filters.dateTo)
          ? `${filters.dateFrom || "any"} → ${filters.dateTo || "today"}`
          : DATE_PRESET_LABELS[filters.datePreset],
      clear: () => onChange({ datePreset: "any", dateFrom: "", dateTo: "" }),
    });
  if (filters.sort !== "recent")
    chips.push({ id: "sort", label: "Oldest first", clear: () => onChange({ sort: "recent" }) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft" />
          <input
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder="Search meetings, participants, transcripts..."
            aria-label="Search meetings"
            className="h-9 w-full rounded-[9px] border border-border bg-white pl-9 pr-3 text-[13px] text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/12"
          />
        </div>
        <ParticipantPicker value={filters.participant} onChange={(participant) => onChange({ participant })} />
        <TagPicker value={filters.tag} onChange={(tag) => onChange({ tag })} />
        <DatePicker filters={filters} onChange={onChange} />
        <SortPicker value={filters.sort} onChange={(sort) => onChange({ sort })} />
        <Button variant="primary" onClick={onCreate} icon={<span className="text-[15px] leading-none">+</span>}>
          New meeting
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <span>
          Showing <strong className="font-medium text-ink-soft">{resultCount}</strong> of {total}{" "}
          {total === 1 ? "meeting" : "meetings"}
        </span>
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-full border border-primary-border bg-primary-soft px-2 py-[2px] text-[11.5px] text-primary-hover"
          >
            {chip.label}
            <button type="button" onClick={chip.clear} aria-label={`Clear ${chip.id} filter`} className="rounded-full p-[1px]">
              <CloseIcon size={11} />
            </button>
          </span>
        ))}
        {chips.length > 0 ? (
          <button type="button" onClick={onReset} className="text-[12px] font-medium text-primary hover:underline">
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
