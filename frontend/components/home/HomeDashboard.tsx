"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ArrowRightIcon, ClockIcon, MeetingsIcon, UploadIcon, CheckCircleIcon, TeamIcon } from "@/components/icons";
import { MeetingCreateModal } from "@/components/meetings/MeetingCreateModal";
import { MeetingTable } from "@/components/meetings/MeetingTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCurrentUser, useMeetings, useStats } from "@/hooks/useMeetings";
import { useToast } from "@/hooks/useToast";
import { api, errorMessage } from "@/lib/api";
import type { MeetingListItem } from "@/lib/types";

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-white px-3.5 py-3">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-primary-soft text-primary">{icon}</span>
        <span className="text-[11.5px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11.5px] text-muted">{hint}</p>
    </div>
  );
}

/** Home / dashboard: workspace stats, recent meetings and quick actions. */
export function HomeDashboard() {
  const router = useRouter();
  const toast = useToast();
  const user = useCurrentUser();
  const stats = useStats();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MeetingListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const query = useMemo(() => ({ sort: "recent" as const, limit: 6 }), []);
  const { meetings, loading, error, reload } = useMeetings(query);

  // Computed after mount: the server has no access to the viewer's clock,
  // so rendering it during SSR would cause a hydration mismatch.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

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

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">
            {greeting}
            {user.data ? `, ${user.data.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Your meeting workspace — transcripts, AI notes and action items in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<UploadIcon size={14} />} onClick={() => router.push("/uploads")}>
            Import transcript
          </Button>
          <Button variant="primary" icon={<span className="text-[15px] leading-none">+</span>} onClick={() => setCreateOpen(true)}>
            New meeting
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Meetings"
          value={stats.data ? String(stats.data.meeting_count) : "—"}
          hint="Recorded meetings in this workspace"
          icon={<MeetingsIcon size={14} />}
        />
        <StatCard
          label="Transcript time"
          value={stats.data ? `${stats.data.transcript_minutes} min` : "—"}
          hint={stats.data ? `${stats.data.transcription_minutes_quota - stats.data.transcript_minutes} of ${stats.data.transcription_minutes_quota} mins left` : "Loading usage"}
          icon={<ClockIcon size={14} />}
        />
        <StatCard
          label="Open tasks"
          value={stats.data ? String(stats.data.open_action_items) : "—"}
          hint={stats.data ? `${stats.data.completed_action_items} completed` : "Loading tasks"}
          icon={<CheckCircleIcon size={14} />}
        />
        <StatCard
          label="Participants"
          value={stats.data ? String(stats.data.participant_count) : "—"}
          hint="People seen across your meetings"
          icon={<TeamIcon size={14} />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_288px]">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14.5px] font-semibold text-ink">Recent meetings</h2>
            <Link href="/meetings" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
              View all <ArrowRightIcon size={13} />
            </Link>
          </div>
          <MeetingTable
            meetings={meetings}
            loading={loading && meetings.length === 0}
            error={error}
            onRetry={() => void reload({ quiet: false })}
            onEdit={(meeting) => router.push(`/meetings/${meeting.id}`)}
            onDelete={setDeleteTarget}
            onCopyLink={async (meeting) => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/meetings/${meeting.id}`);
                toast.success("Link copied", meeting.title);
              } catch {
                toast.error("Could not copy the link");
              }
            }}
            emptyTitle="No meetings yet"
            emptyDescription="Create your first meeting from a pasted transcript."
            emptyAction={
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                Create meeting
              </Button>
            }
          />
        </section>

        <aside aria-label="Quick actions and workspace status" className="space-y-3">
          <div className="rounded-[12px] border border-border bg-white p-3.5">
            <h3 className="text-[13px] font-semibold text-ink">Quick actions</h3>
            <div className="mt-2.5 space-y-2">
              <Link
                href="/uploads"
                className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 transition-colors hover:border-primary-border hover:bg-primary-soft/50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                  <UploadIcon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-ink">Upload a transcript</span>
                  <span className="block text-[11px] text-muted">TXT, VTT or JSON</span>
                </span>
                <ArrowRightIcon size={14} className="text-muted" />
              </Link>
              <Link
                href="/meetings"
                className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 transition-colors hover:border-primary-border hover:bg-primary-soft/50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                  <MeetingsIcon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-medium text-ink">Browse the library</span>
                  <span className="block text-[11px] text-muted">Search, filter and sort</span>
                </span>
                <ArrowRightIcon size={14} className="text-muted" />
              </Link>
            </div>
          </div>


        </aside>
      </div>

      <MeetingCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void reload({ quiet: true })} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this meeting?"
        message={deleteTarget ? `“${deleteTarget.title}” will be permanently deleted.` : ""}
        confirmLabel="Delete meeting"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
