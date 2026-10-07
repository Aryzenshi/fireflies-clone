/**
 * Transcript utilities.
 *
 * These are pure functions so they can be unit tested (see tests/transcript.test.ts)
 * and shared between the player and the transcript panel.
 */

import type { TranscriptSegment } from "@/lib/types";

/**
 * Return the index of the segment that should be highlighted for `time`.
 *
 * A segment is active when `start <= time < end`. Between segments (in the gap
 * before the next cue) the previous segment stays active; before the first cue
 * (or for an empty transcript) the result is `-1`.
 */
export function findActiveSegmentIndex(segments: TranscriptSegment[], time: number): number {
  if (segments.length === 0) return -1;
  if (time < segments[0].start_seconds) return -1;

  let candidate = 0;
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index].start_seconds <= time) {
      candidate = index;
    } else {
      break;
    }
  }
  return candidate;
}

export function clampTime(time: number, duration: number): number {
  if (Number.isNaN(time)) return 0;
  const safeDuration = duration > 0 ? duration : 0;
  return Math.min(Math.max(0, time), safeDuration);
}

/** Effective duration: prefer the media duration, fall back to the last cue. */
export function transcriptDuration(segments: TranscriptSegment[], fallback: number): number {
  const lastEnd = segments.reduce((max, segment) => Math.max(max, segment.end_seconds), 0);
  return Math.max(fallback, lastEnd);
}

export interface TranscriptMatch {
  segmentId: string;
  segmentIndex: number;
  /** Index of the match within the segment text (character offset). */
  offset: number;
  length: number;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Find every occurrence of `query` inside the transcript.
 *
 * Offsets refer to the *normalized* text of the segment, which is also what
 * `highlightParts` splits on, so highlighting and navigation always agree.
 */
export function findMatches(segments: TranscriptSegment[], query: string): TranscriptMatch[] {
  const needle = normalize(query);
  if (!needle) return [];

  const matches: TranscriptMatch[] = [];
  segments.forEach((segment, segmentIndex) => {
    const haystack = normalize(segment.text);
    let cursor = haystack.indexOf(needle);
    while (cursor !== -1) {
      matches.push({
        segmentId: segment.id,
        segmentIndex,
        offset: cursor,
        length: needle.length,
      });
      cursor = haystack.indexOf(needle, cursor + needle.length);
    }
  });
  return matches;
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * Split `text` into alternating plain / matched parts so the UI can render
 * `<mark>` tags without breaking the rest of the line.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const needle = normalize(query);
  if (!needle) return [{ text, match: false }];

  const haystack = text.replace(/\s+/g, " ").trim();
  const parts: HighlightPart[] = [];
  let cursor = 0;
  let index = haystack.toLowerCase().indexOf(needle);

  while (index !== -1) {
    if (index > cursor) parts.push({ text: haystack.slice(cursor, index), match: false });
    parts.push({ text: haystack.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
    index = haystack.toLowerCase().indexOf(needle, cursor);
  }
  if (cursor < haystack.length) parts.push({ text: haystack.slice(cursor), match: false });
  return parts.length > 0 ? parts : [{ text: haystack, match: false }];
}

export function speakingTimeLabel(segment: TranscriptSegment): string {
  return `${segment.start_seconds}s – ${segment.end_seconds}s`;
}
