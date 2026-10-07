"use client";

import { useCallback, useRef, useState } from "react";

import { clampTime } from "@/lib/transcript";

/**
 * Accessible seek bar.
 *
 * A custom slider (instead of `<input type=range>`) so the filled track,
 * chapter markers and drag behaviour match the reference player exactly.
 */
export function SeekBar({
  value,
  max,
  onSeek,
  markers = [],
  ariaLabel = "Seek",
  step = 5,
}: {
  value: number;
  max: number;
  onSeek: (seconds: number) => void;
  markers?: number[];
  ariaLabel?: string;
  step?: number;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const ratio = max > 0 ? clampTime(value, max) / max : 0;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const position = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      onSeek(position * max);
    },
    [max, onSeek],
  );

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.floor(value / 60)} minutes ${Math.round(value % 60)} seconds`}
      onPointerDown={(event) => {
        event.preventDefault();
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        setDragging(true);
        seekFromClientX(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging) seekFromClientX(event.clientX);
      }}
      onPointerUp={(event) => {
        setDragging(false);
        (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onSeek(Math.min(value + step, max));
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          onSeek(Math.max(value - step, 0));
        } else if (event.key === "Home") {
          event.preventDefault();
          onSeek(0);
        } else if (event.key === "End") {
          event.preventDefault();
          onSeek(max);
        }
      }}
      className="group relative flex h-4 cursor-pointer touch-none items-center rounded-full focus-visible:outline-none"
    >
      <div className={`w-full rounded-full bg-[#E3E5EB] transition-all ${dragging ? "h-[5px]" : "h-[4px] group-hover:h-[5px]"}`}>
        <div
          className="relative h-full rounded-full bg-primary"
          style={{ width: `${ratio * 100}%` }}
        >
          <span
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-primary bg-white shadow-panel transition-all ${
              dragging ? "h-[13px] w-[13px]" : "h-[11px] w-[11px] group-hover:h-[13px] group-hover:w-[13px]"
            }`}
          />
        </div>
      </div>

      {markers.map((marker, index) => {
        const markerRatio = max > 0 ? clampTime(marker, max) / max : 0;
        return (
          <span
            key={`${marker}-${index}`}
            title={`Chapter at ${Math.floor(marker / 60)}:${String(Math.round(marker % 60)).padStart(2, "0")}`}
            className="pointer-events-none absolute top-1/2 h-[7px] w-[2px] -translate-y-1/2 rounded-full bg-[#B9BDC9]"
            style={{ left: `${markerRatio * 100}%` }}
          />
        );
      })}
    </div>
  );
}
