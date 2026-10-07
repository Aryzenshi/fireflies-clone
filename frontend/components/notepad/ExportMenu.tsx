"use client";

import { useState } from "react";

import { DownloadIcon, FileTextIcon, CopyIcon } from "@/components/icons";
import { Dropdown } from "@/components/ui/Dropdown";
import { useToast } from "@/hooks/useToast";
import { errorMessage, fetchMeetingExport, type ExportFormat } from "@/lib/api";

const FORMATS: { id: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "markdown",
    label: "Markdown (.md)",
    description: "Notes, action items and transcript",
    icon: <FileTextIcon size={14} />,
  },
  {
    id: "txt",
    label: "Plain text (.txt)",
    description: "Same content, no markup",
    icon: <CopyIcon size={14} />,
  },
];

/**
 * Export menu for the notepad: asks the API for a rendered document and saves it
 * with the filename the server chose (date + slugged title).
 */
export function ExportMenu({ meetingId, meetingTitle }: { meetingId: string; meetingTitle: string }) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const download = async (format: ExportFormat) => {
    setBusy(format);
    try {
      const { blob, filename } = await fetchMeetingExport(meetingId, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      // Remove and revoke on the next tick so the download has started in every browser.
      window.setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
      }, 1000);
      success("Export ready", `${filename} was downloaded.`);
    } catch (caught) {
      error("Could not export this meeting", errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dropdown
      label="Export meeting"
      width={244}
      items={FORMATS.map((format) => ({
        id: format.id,
        label: busy === format.id ? `${format.label} — preparing…` : format.label,
        description: format.description,
        icon: format.icon,
        onSelect: () => void download(format.id),
      }))}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Export ${meetingTitle}`}
          className="inline-flex h-[28px] items-center gap-1.5 rounded-[7px] border border-border px-2 text-[11.5px] text-muted transition-colors hover:bg-surface"
        >
          <DownloadIcon size={13} />
          Export
        </button>
      )}
    />
  );
}
