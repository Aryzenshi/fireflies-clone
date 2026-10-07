/** Formatting helpers shared by the meeting library and the notepad. */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function parseDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** `Mon, Oct 5` */
export function formatDate(value: string | Date): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** `Fri, Jun 07` (matches the reference share dialog) */
export function formatDatePadded(value: string | Date): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${day}`;
}

/** `9:00 AM` */
export function formatTime(value: string | Date): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** `Fri, Jun 07, 09:00 AM` */
export function formatDateTime(value: string | Date): string {
  return `${formatDatePadded(value)}, ${formatTime(value)}`;
}

/** `2026-10-05T09:00` for `<input type="datetime-local">` */
export function toDateTimeLocalValue(value: string | Date): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** `29:10` (or `1:02:03` when the meeting is longer than an hour) */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** `29 min` / `1 hr 12 min` — used in tables and stat cards. */
export function formatDurationLabel(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** `Today`, `Yesterday`, `3 days ago`, then `Mon, Oct 5`. */
export function formatRelativeDay(value: string | Date): string {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const startOfDay = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const diffDays = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays === -1) return "Tomorrow";
  return formatDate(date);
}

/** Due dates read as `Overdue`, `Due today`, `Due Fri`, `Due Oct 10`. */
export function formatDueDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((due.getTime() - startOfToday.getTime()) / 86_400_000);
  if (diffDays < 0) return `Overdue · ${MONTHS[due.getMonth()]} ${due.getDate()}`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) return `Due ${WEEKDAYS[due.getDay()]}`;
  return `Due ${MONTHS[due.getMonth()]} ${due.getDate()}`;
}

export function isOverdue(value: string | null | undefined): boolean {
  if (!value) return false;
  const due = new Date(`${value}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return due.getTime() < startOfToday.getTime();
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  "#6E68E8",
  "#2F80ED",
  "#40A36C",
  "#D9793B",
  "#B44BC0",
  "#0F9BA8",
  "#C05C7E",
  "#7A6FF0",
  "#4C6EF5",
  "#8C6D1F",
] as const;

/** Deterministic avatar colour so the same person always looks the same. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 100000;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function truncate(value: string, max = 90): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
