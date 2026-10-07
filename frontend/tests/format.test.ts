import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatDurationLabel,
  formatDueDate,
  formatTime,
  initialsOf,
  toDateTimeLocalValue,
  truncate,
} from "@/lib/format";

describe("duration formatting", () => {
  it("renders mm:ss under an hour and h:mm:ss above it", () => {
    expect(formatDuration(1750)).toBe("29:10");
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(-5)).toBe("00:00");
  });

  it("renders human labels for stat cards", () => {
    expect(formatDurationLabel(1740)).toBe("29 min");
    expect(formatDurationLabel(3720)).toBe("1 hr 2 min");
    expect(formatDurationLabel(3600)).toBe("1 hr");
  });
});

describe("date formatting", () => {
  it("formats library dates and times", () => {
    const value = new Date(2026, 5, 7, 9, 0);
    expect(formatDate(value)).toBe("Sun, Jun 7");
    expect(formatTime(value)).toBe("9:00 AM");
    expect(formatDateTime(value)).toBe("Sun, Jun 07, 9:00 AM");
  });

  it("formats values for datetime-local inputs", () => {
    expect(toDateTimeLocalValue(new Date(2026, 0, 2, 8, 5))).toBe("2026-01-02T08:05");
  });

  it("describes due dates relative to today", () => {
    const now = new Date();
    const iso = (offsetDays: number) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    expect(formatDueDate(iso(0))).toBe("Due today");
    expect(formatDueDate(iso(1))).toBe("Due tomorrow");
    expect(formatDueDate(iso(-2))).toContain("Overdue");
    expect(formatDueDate(null)).toBeNull();
  });
});

describe("misc helpers", () => {
  it("builds initials", () => {
    expect(initialsOf("Aaron Kantor")).toBe("AK");
    expect(initialsOf("Priya")).toBe("PR");
    expect(initialsOf("   ")).toBe("?");
  });

  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("hell…");
    expect(truncate("short", 20)).toBe("short");
  });
});
