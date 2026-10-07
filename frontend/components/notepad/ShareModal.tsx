"use client";

import { useState } from "react";

import { ArrowRightIcon, CopyIcon, GlobeIcon, GoogleIcon, LinkIcon, SearchIcon, SlackIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

/**
 * Share dialog modelled on the reference screenshot: title + metadata line,
 * Share / Embed tabs, invite row, teammate access list and the anyone-with-link row.
 * Real collaboration permissions are out of scope, so invites are placeholders
 * while "Copy Link" performs a genuine clipboard write.
 */
export function ShareModal({
  meeting,
  open,
  onClose,
}: {
  meeting: MeetingDetail;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState("share");
  const [invite, setInvite] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window === "undefined" ? `/meetings/${meeting.id}` : `${window.location.origin}/meetings/${meeting.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied", "Anyone with the link can view this meeting in the demo workspace.");
    } catch {
      toast.error("Could not copy the link", "Your browser blocked clipboard access.");
    }
  };

  const embedSnippet = `<iframe src="${shareUrl}?embed=1" width="100%" height="520" frameborder="0"></iframe>`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meeting.title}
      subtitle={`${meeting.host_name ?? "Host"} · ${formatDateTime(meeting.started_at)}`}
      size="md"
    >
      <Tabs
        items={[
          { id: "share", label: "Share" },
          { id: "embed", label: "Embed" },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === "share" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-[9px] bg-surface px-2.5 py-2">
            <span className="rounded-[5px] bg-primary px-1.5 py-[2px] text-[9.5px] font-bold tracking-wide text-white">
              NEW
            </span>
            <span className="text-[12.5px] text-ink-soft">Share with specific teams using user groups.</span>
            <button
              type="button"
              onClick={() => toast.info("User groups are out of scope", "Team collaboration is a placeholder in this build.")}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline"
            >
              Create Group <ArrowRightIcon size={12} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={invite}
              onChange={(event) => setInvite(event.target.value)}
              placeholder="Name, Email or User Group"
              icon={<SearchIcon size={13} />}
              className="flex-1"
            />
            <Button
              variant="primary"
              disabled={invite.trim().length === 0}
              onClick={() => {
                toast.info("Invitations are not implemented", `${invite.trim()} was not sent — sharing is a placeholder.`);
                setInvite("");
              }}
            >
              Invite
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span>Share with contacts on</span>
            <ArrowRightIcon size={12} />
            <span className="flex items-center gap-1.5">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-white">
                <GoogleIcon size={13} />
              </span>
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border bg-white">
                <SlackIcon size={13} />
              </span>
            </span>
            <button
              type="button"
              onClick={() => toast.info("Integrations are out of scope", "Zoom, Google Meet and Slack are mocked in this build.")}
              className="ml-auto inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
            >
              <LinkIcon size={12} /> Add integration
            </button>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-medium text-muted">Teammates with access</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2.5 rounded-[9px] border border-border px-2.5 py-2">
                <Avatar name={meeting.host_name ?? "Host"} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">{meeting.host_name ?? "Host"}</p>
                  <p className="truncate text-[11px] text-muted">Host of this meeting</p>
                </div>
                <span className="text-[10.5px] font-semibold tracking-wide text-muted">HOST</span>
              </li>
              {meeting.participants
                .filter((participant) => participant.name !== meeting.host_name)
                .map((participant) => (
                  <li key={participant.id} className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 hover:bg-surface">
                    <Avatar name={participant.name} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">{participant.name}</p>
                      <p className="truncate text-[11px] text-muted">{participant.email ?? "Participant"}</p>
                    </div>
                    <select
                      aria-label={`Access level for ${participant.name}`}
                      defaultValue="view"
                      onChange={() =>
                        toast.info("Permissions are read-only here", "Real access control is out of scope for this build.")
                      }
                      className="h-[26px] cursor-pointer rounded-[7px] border border-border bg-white px-1.5 text-[11.5px] text-ink-soft"
                    >
                      <option value="view">Can view</option>
                      <option value="edit">Can edit</option>
                    </select>
                  </li>
                ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 rounded-[10px] border border-border px-2.5 py-2.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-surface-muted text-muted">
              <GlobeIcon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] text-ink-soft">
                Anyone with Link <span className="text-muted">⌄</span>
              </p>
              <p className="text-[11px] text-muted">Anyone with link can access</p>
            </div>
            <Button size="sm" variant="secondary" icon={<CopyIcon size={13} />} onClick={() => void copyLink()}>
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12.5px] text-muted">
            Paste this snippet to embed the meeting notepad in another page. Embedding is a visual placeholder — the
            iframe renders the same Next.js route.
          </p>
          <pre className="scroll-area overflow-x-auto rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[11.5px] text-ink-soft">
            {embedSnippet}
          </pre>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<CopyIcon size={13} />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(embedSnippet);
                  toast.success("Embed snippet copied");
                } catch {
                  toast.error("Could not copy the snippet");
                }
              }}
            >
              Copy snippet
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
