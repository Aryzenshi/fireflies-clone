"use client";

import { PauseIcon, PlayIcon, RewindIcon, ForwardIcon, WaveIcon } from "@/components/icons";
import { ExportMenu } from "@/components/notepad/ExportMenu";
import { Avatar } from "@/components/ui/Avatar";
import { SeekBar } from "@/components/ui/SeekBar";
import { useToast } from "@/hooks/useToast";
import { PLAYBACK_SPEEDS } from "@/lib/constants";
import { formatDuration } from "@/lib/format";
import type { TranscriptSegment } from "@/lib/types";

export interface MediaPlayerProps {
  meetingId: string;
  meetingTitle: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  speed: number;
  activeSegment: TranscriptSegment | null;
  markers: number[];
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

/**
 * Simulated media player: no audio/video file is shipped with this build, so
 * playback is driven by a synthetic clock that the transcript panel shares
 * (`currentTime` is owned by MeetingWorkspace — see Architecture.md §6).
 */
export function MediaPlayer({
  meetingId,
  meetingTitle,
  currentTime,
  duration,
  playing,
  speed,
  activeSegment,
  markers,
  onSeek,
  onTogglePlay,
  onSpeedChange,
}: MediaPlayerProps) {
  const { info } = useToast();

  return (
    <section
      aria-label="Meeting player"
      className="shrink-0 border-t border-border bg-white px-3.5 py-2.5"
    >
      <div className="flex items-center gap-3">
        {/* placeholder media tile (original artwork, no third-party assets) */}
        <div className="relative hidden h-[58px] w-[102px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#111214] sm:flex">
          <div className="flex items-end gap-[2.5px]" aria-hidden="true">
            {[8, 14, 20, 12, 24, 16, 10, 18, 13, 22, 9, 15].map((height, index) => (
              <span
                key={index}
                className={`w-[2.5px] rounded-full ${playing ? "bg-primary" : "bg-white/35"}`}
                style={{
                  height: `${playing ? Math.max(6, (height * (1 + Math.sin((currentTime + index) / 1.5) * 0.35)) | 0) : height}px`,
                }}
              />
            ))}
          </div>
          <span className="absolute bottom-1 right-1.5 text-[8px] font-medium uppercase tracking-wide text-white/45">
            demo
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={playing ? "Pause playback" : "Play from current position"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover"
            >
              {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} className="ml-[1px]" />}
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, currentTime - 10))}
              aria-label="Rewind 10 seconds"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <RewindIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.min(duration, currentTime + 10))}
              aria-label="Forward 10 seconds"
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <ForwardIcon size={16} />
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="sr-only">Playback speed</span>
            <select
              value={speed}
              onChange={(event) => onSpeedChange(Number(event.target.value))}
              className="h-[26px] cursor-pointer rounded-[7px] border border-border bg-white px-1.5 text-[11.5px] text-ink-soft focus:border-primary focus:outline-none"
            >
              {PLAYBACK_SPEEDS.map((option) => (
                <option key={option} value={option}>
                  {option}×
                </option>
              ))}
            </select>
            <span className="hidden lg:inline">{playing ? "Playing" : "Paused"}</span>
          </label>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="w-[46px] shrink-0 text-right font-mono text-[11.5px] text-ink-soft">
              {formatDuration(currentTime)}
            </span>
            <SeekBar
              value={currentTime}
              max={duration}
              markers={markers}
              onSeek={onSeek}
              ariaLabel="Seek within meeting"
            />
            <span className="w-[46px] shrink-0 font-mono text-[11.5px] text-muted">{formatDuration(duration)}</span>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {activeSegment ? (
              <>
                <Avatar name={activeSegment.speaker} size={18} />
                <span className="truncate text-[11.5px] font-medium text-ink-soft">{activeSegment.speaker}</span>
                <span className="hidden min-w-0 flex-1 truncate text-[11.5px] text-muted lg:block">
                  {activeSegment.text}
                </span>
              </>
            ) : (
              <span className="text-[11.5px] text-muted">
                Press play to follow along, or click any transcript line to jump to it.
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() =>
              info("Sync with audio is not available", "This build plays a simulated timeline instead of audio.")
            }
            className="inline-flex h-[28px] items-center gap-1.5 rounded-[7px] border border-border px-2 text-[11.5px] text-muted transition-colors hover:bg-surface"
          >
            <WaveIcon size={13} />
            Sync with audio
          </button>
          <ExportMenu meetingId={meetingId} meetingTitle={meetingTitle} />
        </div>
      </div>
    </section>
  );
}
