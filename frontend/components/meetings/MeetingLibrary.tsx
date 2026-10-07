"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MeetingsIcon, UploadIcon } from "@/components/icons";
import { MeetingCreateModal } from "@/components/meetings/MeetingCreateModal";
import { MeetingFilters, hasActiveFilters, resolveDateRange } from "@/components/meetings/MeetingFilters";
import type { DatePreset, LibraryFilters } from "@/components/meetings/MeetingFilters";
import { MeetingSettingsModal } from "@/components/meetings/MeetingSettingsModal";
import { MeetingTable } from "@/components/meetings/MeetingTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMeetings } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { MeetingDetail, MeetingListItem } from "@/lib/types";

const PRESETS: DatePreset[] = ["any", "today", "7d", "30d", "custom"];

function parseFilters(searchParams: URLSearchParams): LibraryFilters {
  const preset = searchParams.get("range") as DatePreset | null;
  return {
    q: searchParams.get("q") ?? "",
    participant: searchParams.get("participant") ?? "",
    tag: searchParams.get("tag") ?? "",
    sort: searchParams.get("sort") === "oldest" ? "oldest" : "recent",
    datePreset: preset && PRESETS.includes(preset) ? preset : "any",
    dateFrom: searchParams.get("from") ?? "",
    dateTo: searchParams.get("to") ?? "",
  };
}

function serializeFilters(filters: LibraryFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.participant) params.set("participant", filters.participant);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.datePreset !== "any") params.set("range", filters.datePreset);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  return params.toString();
}

/**
 * Meetings library: search / participant filter / date filter / recency sort,
 * with row actions for edit, copy link and delete.
 *
 * Filters live in the URL so the top-bar search and the browser back button
 * both drive the same query.
 */
export function MeetingLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const urlFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const [searchTerm, setSearchTerm] = useState(urlFilters.q);
  const debouncedTerm = useDebouncedValue(searchTerm, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MeetingDetail | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(
    () => ({
      q: urlFilters.q || undefined,
      participant: urlFilters.participant || undefined,
      tag: urlFilters.tag || undefined,
      sort: urlFilters.sort,
      ...resolveDateRange(urlFilters),
    }),
    [urlFilters],
  );

  const { meetings, total, loading, error, reload } = useMeetings(query);

  // Keep the URL in sync with the debounced search box.
  useEffect(() => {
    if (debouncedTerm === urlFilters.q) return;
    const next = serializeFilters({ ...urlFilters, q: debouncedTerm });
    router.replace(next ? `/meetings?${next}` : "/meetings", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  // Browser navigation / top-bar search updates the input.
  useEffect(() => {
    setSearchTerm((current) => (current === urlFilters.q ? current : urlFilters.q));
  }, [urlFilters.q]);

  const patchFilters = (patch: Partial<LibraryFilters>) => {
    const next = { ...urlFilters, ...patch };
    const serialized = serializeFilters(next);
    router.replace(serialized ? `/meetings?${serialized}` : "/meetings", { scroll: false });
  };

  const resetFilters = () => {
    setSearchTerm("");
    router.replace("/meetings", { scroll: false });
  };

  const openEdit = async (meeting: MeetingListItem) => {
    setEditLoadingId(meeting.id);
    try {
      const detail = await api.getMeeting(meeting.id);
      setEditTarget(detail);
    } catch (caught) {
      toast.error("Could not open the meeting", errorMessage(caught));
    } finally {
      setEditLoadingId(null);
    }
  };

  const copyLink = async (meeting: MeetingListItem) => {
    const url = `${window.location.origin}/meetings/${meeting.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", url);
    } catch {
      toast.error("Could not copy the link", "Your browser blocked clipboard access.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMeeting(deleteTarget.id);
      toast.success("Meeting deleted", deleteTarget.title);
      setDeleteTarget(null);
      await reload({ quiet: true });
      window.dispatchEvent(new Event("refresh-stats"));
    } catch (caught) {
      toast.error("Could not delete the meeting", errorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = hasActiveFilters(urlFilters);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Meetings</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Every recorded meeting with its transcript, AI notes and action items.
          </p>
        </div>
        <p className="text-[12px] text-muted">
          {loading ? "Loading…" : `${total} ${total === 1 ? "meeting" : "meetings"} in this workspace`}
        </p>
      </div>

      <div className="mb-3">
        <MeetingFilters
          filters={{ ...urlFilters, q: searchTerm }}
          onChange={(patch) => {
            if (patch.q !== undefined) {
              setSearchTerm(patch.q);
              return;
            }
            patchFilters(patch);
          }}
          onReset={resetFilters}
          onCreate={() => setCreateOpen(true)}
          resultCount={meetings.length}
          total={total}
        />
      </div>

      <MeetingTable
        meetings={meetings}
        loading={loading && meetings.length === 0}
        error={error}
        onRetry={() => void reload({ quiet: false })}
        onEdit={(meeting) => void openEdit(meeting)}
        onDelete={setDeleteTarget}
        onCopyLink={(meeting) => void copyLink(meeting)}
        onFilterByTag={(tag) => patchFilters({ tag })}
        emptyTitle={filtersActive ? "No meetings match your filters" : "No meetings yet"}
        emptyDescription={
          filtersActive
            ? "Try a different search term, participant or date range."
            : "Create a meeting from a pasted transcript, or import a TXT, VTT or JSON file."
        }
        emptyAction={
          filtersActive ? (
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="primary" size="sm" icon={<MeetingsIcon size={14} />} onClick={() => setCreateOpen(true)}>
                Create meeting
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<UploadIcon size={14} />}
                onClick={() => router.push("/uploads")}
              >
                Import transcript
              </Button>
            </div>
          )
        }
      />

      {editLoadingId ? <p className="mt-2 text-[11.5px] text-muted">Loading meeting details…</p> : null}

      <MeetingCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void reload({ quiet: true })}
      />
      <MeetingSettingsModal
        meeting={editTarget}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          void reload({ quiet: true });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this meeting?"
        message={
          deleteTarget
            ? `“${deleteTarget.title}” and its transcript, AI notes and action items will be permanently deleted.`
            : ""
        }
        confirmLabel="Delete meeting"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
