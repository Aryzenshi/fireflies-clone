/**
 * Typed API client for the FastAPI backend.
 *
 * Browser requests go to `/api/*` on the Next.js origin and are proxied to the
 * backend (see next.config.ts). Set NEXT_PUBLIC_API_BASE_URL to talk to the
 * backend directly instead (CORS is enabled for local development origins).
 */

import type {
  ActionItem,
  ActionItemInput,
  ActionItemPatch,
  Comment,
  CommentCreateInput,
  HealthResponse,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListResponse,
  MeetingQuery,
  MeetingUpdateInput,
  ParticipantSummary,
  Stats,
  TagSummary,
  TranscriptSegment,
  UserProfile,
} from "@/lib/types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach the API. Make sure the FastAPI backend is running on port 8000.",
      0,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        message = String((payload.detail[0] as { msg?: string }).msg ?? message);
      }
    } catch {
      /* response had no JSON body — keep the default message */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export type ExportFormat = "markdown" | "txt" | "pdf";

/** Fetch a meeting export as a Blob plus the server-chosen filename. */
export async function fetchMeetingExport(
  meetingId: string,
  format: ExportFormat,
): Promise<{ blob: Blob; filename: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/meetings/${meetingId}/export?format=${format}`, {
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Could not reach the API. Make sure the FastAPI backend is running on port 8000.",
      0,
    );
  }
  if (!response.ok) {
    let message = `Export failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") message = payload.detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(message, response.status);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? `meeting-${meetingId}.${format === "markdown" ? "md" : format === "pdf" ? "pdf" : "txt"}`,
  };
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  listMeetings: (query: MeetingQuery = {}) =>
    request<MeetingListResponse>(
      `/meetings${buildQuery({
        q: query.q,
        participant: query.participant,
        tag: query.tag,
        date_from: query.date_from,
        date_to: query.date_to,
        sort: query.sort,
        limit: query.limit,
      })}`,
    ),

  getMeeting: (meetingId: string) => request<MeetingDetail>(`/meetings/${meetingId}`),

  createMeeting: (payload: MeetingCreateInput) =>
    request<MeetingDetail>("/meetings", { method: "POST", body: JSON.stringify(payload) }),

  importMeeting: (
    file: File,
    meta: { title?: string; participants?: string; tags?: string; started_at?: string } = {},
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (meta.title) form.append("title", meta.title);
    if (meta.participants) form.append("participants", meta.participants);
    if (meta.tags) form.append("tags", meta.tags);
    if (meta.started_at) form.append("started_at", meta.started_at);
    return request<MeetingDetail>("/meetings/import", { method: "POST", body: form });
  },

  updateMeeting: (meetingId: string, payload: MeetingUpdateInput) =>
    request<MeetingDetail>(`/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteMeeting: (meetingId: string) =>
    request<{ deleted: boolean }>(`/meetings/${meetingId}`, { method: "DELETE" }),

  replaceTranscript: (meetingId: string, transcriptText: string) =>
    request<MeetingDetail>(`/meetings/${meetingId}/transcript`, {
      method: "POST",
      body: JSON.stringify({ transcript_text: transcriptText }),
    }),

  updateSegment: (meetingId: string, segmentId: string, text: string) =>
    request<TranscriptSegment>(`/meetings/${meetingId}/transcript/${segmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    }),

  regenerateSummary: (meetingId: string) =>
    request<MeetingDetail>(`/meetings/${meetingId}/summary/regenerate`, { method: "POST" }),

  listActionItems: (meetingId: string) =>
    request<ActionItem[]>(`/meetings/${meetingId}/action-items`),

  addActionItem: (meetingId: string, payload: ActionItemInput) =>
    request<ActionItem>(`/meetings/${meetingId}/action-items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateActionItem: (actionItemId: string, payload: ActionItemPatch) =>
    request<ActionItem>(`/action-items/${actionItemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteActionItem: (actionItemId: string) =>
    request<{ deleted: boolean }>(`/action-items/${actionItemId}`, { method: "DELETE" }),

  listComments: (meetingId: string) => request<Comment[]>(`/meetings/${meetingId}/comments`),

  addComment: (meetingId: string, payload: CommentCreateInput) =>
    request<Comment>(`/meetings/${meetingId}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateComment: (commentId: string, body: string) =>
    request<Comment>(`/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }),

  deleteComment: (commentId: string) =>
    request<{ deleted: boolean }>(`/comments/${commentId}`, { method: "DELETE" }),

  listTags: () => request<TagSummary[]>("/tags"),

  listParticipants: () => request<ParticipantSummary[]>("/participants"),

  getStats: () => request<Stats>("/stats"),

  getCurrentUser: () => request<UserProfile>("/users/me"),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
