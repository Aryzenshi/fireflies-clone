import { describe, expect, it } from "vitest";

import {
  clampTime,
  findActiveSegmentIndex,
  findMatches,
  highlightParts,
  transcriptDuration,
} from "@/lib/transcript";
import type { TranscriptSegment } from "@/lib/types";

const segments: TranscriptSegment[] = [
  { id: "s1", speaker: "Ada", start_seconds: 0, end_seconds: 12, sequence: 0, text: "Welcome to the release review." },
  { id: "s2", speaker: "Grace", start_seconds: 12, end_seconds: 30, sequence: 1, text: "The release plan is ready today." },
  { id: "s3", speaker: "Ada", start_seconds: 30, end_seconds: 48, sequence: 2, text: "Let's double check the release notes." },
];

describe("findActiveSegmentIndex (player -> transcript sync)", () => {
  it("returns -1 before the first cue", () => {
    const late: TranscriptSegment[] = [{ ...segments[0], start_seconds: 5, end_seconds: 10 }];
    expect(findActiveSegmentIndex(late, 0)).toBe(-1);
  });

  it("returns -1 for an empty transcript", () => {
    expect(findActiveSegmentIndex([], 10)).toBe(-1);
  });

  it("maps a timestamp to the containing segment", () => {
    expect(findActiveSegmentIndex(segments, 0)).toBe(0);
    expect(findActiveSegmentIndex(segments, 11.9)).toBe(0);
    expect(findActiveSegmentIndex(segments, 12)).toBe(1);
    expect(findActiveSegmentIndex(segments, 29)).toBe(1);
    expect(findActiveSegmentIndex(segments, 30)).toBe(2);
  });

  it("keeps the previous segment active in the gap before the next cue", () => {
    const withGap: TranscriptSegment[] = [
      { id: "a", speaker: "A", start_seconds: 0, end_seconds: 10, sequence: 0, text: "first" },
      { id: "b", speaker: "B", start_seconds: 20, end_seconds: 30, sequence: 1, text: "second" },
    ];
    expect(findActiveSegmentIndex(withGap, 15)).toBe(0);
  });

  it("stays on the last segment past the end of the transcript", () => {
    expect(findActiveSegmentIndex(segments, 999)).toBe(2);
  });

  it("clamps a segment start back into range (transcript -> player sync)", () => {
    const target = segments[2];
    expect(clampTime(target.start_seconds, 48)).toBe(30);
    expect(clampTime(-10, 48)).toBe(0);
    expect(clampTime(999, 48)).toBe(48);
    expect(clampTime(Number.NaN, 48)).toBe(0);
  });
});

describe("transcriptDuration", () => {
  it("prefers the media duration but never loses transcript coverage", () => {
    expect(transcriptDuration(segments, 60)).toBe(60);
    expect(transcriptDuration(segments, 10)).toBe(48);
    expect(transcriptDuration([], 25)).toBe(25);
  });
});

describe("findMatches + highlightParts (transcript search)", () => {
  it("finds every occurrence case-insensitively", () => {
    const matches = findMatches(segments, "release");
    expect(matches.map((match) => match.segmentId)).toEqual(["s1", "s2", "s3"]);
    expect(findMatches(segments, "RELEASE")).toHaveLength(3);
  });

  it("finds multiple matches inside a single segment", () => {
    const repeated: TranscriptSegment[] = [
      { id: "r", speaker: "A", start_seconds: 0, end_seconds: 5, sequence: 0, text: "todo todo todo" },
    ];
    expect(findMatches(repeated, "todo")).toHaveLength(3);
  });

  it("returns no matches for a blank query", () => {
    expect(findMatches(segments, "   ")).toEqual([]);
  });

  it("splits text into matched and unmatched parts", () => {
    const parts = highlightParts("release the release notes", "release");
    expect(parts.filter((part) => part.match)).toHaveLength(2);
    expect(parts.map((part) => part.text).join("")).toBe("release the release notes");
  });

  it("keeps offsets consistent with the normalised text so highlighting cannot drift", () => {
    const messy: TranscriptSegment[] = [
      { id: "m", speaker: "A", start_seconds: 0, end_seconds: 5, sequence: 0, text: "the   plan   is set" },
    ];
    const [match] = findMatches(messy, "plan");
    const parts = highlightParts(messy[0].text, "plan");
    const rebuilt = parts.map((part) => part.text).join("");
    expect(rebuilt.slice(match.offset, match.offset + match.length)).toBe("plan");
  });
});
