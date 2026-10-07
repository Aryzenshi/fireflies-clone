/**
 * API response types — mirrors docs/API.md.
 */

export interface Participant {
  id: string;
  name: string;
  email?: string | null;
}

export interface Comment {
  id: string;
  meeting_id: string;
  segment_id: string | null;
  body: string;
  author_name: string;
  created_at: string | null;
  updated_at: string | null;
  anchor_start_seconds: number | null;
  anchor_speaker: string | null;
  anchor_text: string | null;
}

export interface CommentCreateInput {
  body: string;
  segment_id?: string | null;
}

export interface TagSummary {
  name: string;
  meeting_count: number;
}

export interface ParticipantSummary extends Participant {
  meeting_count: number;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  start_seconds: number;
  end_seconds: number;
  sequence: number;
  text: string;
}

export interface Transcript {
  segments: TranscriptSegment[];
}

export interface SummarySection {
  id: string;
  title: string;
  timestamp_seconds: number | null;
  bullets: string[];
}

export interface Summary {
  overview: string;
  key_points: string[];
  sections: SummarySection[];
  topics: string[];
  generated_by?: string;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingListItem {
  id: string;
  title: string;
  started_at: string;
  duration_seconds: number;
  host_name: string | null;
  source_type: string;
  participants: Participant[];
  action_item_count: number;
  open_action_item_count: number;
  topics: string[];
  tags: string[];
}

export interface MeetingListResponse {
  items: MeetingListItem[];
  total: number;
}

export interface MeetingDetail {
  id: string;
  title: string;
  started_at: string;
  duration_seconds: number;
  host_name: string | null;
  source_type: string;
  created_at: string | null;
  updated_at: string | null;
  participants: Participant[];
  tags: string[];
  summary: Summary;
  action_items: ActionItem[];
  comments: Comment[];
  transcript: Transcript;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  initials: string;
}

export interface Stats {
  meeting_count: number;
  transcript_minutes: number;
  transcription_minutes_quota: number;
  transcription_minutes_left: number;
  open_action_items: number;
  completed_action_items: number;
  participant_count: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  tables: string[];
  meeting_count: number;
}

/** Query parameters accepted by `GET /api/meetings`. */
export interface MeetingQuery {
  q?: string;
  participant?: string;
  tag?: string;
  date_from?: string;
  date_to?: string;
  sort?: "recent" | "oldest";
  limit?: number;
}

export interface MeetingCreateInput {
  title: string;
  started_at?: string | null;
  participants?: string[];
  tags?: string[];
  host_name?: string | null;
  transcript_text?: string | null;
}

export interface MeetingUpdateInput {
  title?: string;
  participants?: string[];
  tags?: string[];
  started_at?: string | null;
  host_name?: string | null;
}

export interface ActionItemInput {
  title: string;
  assignee?: string | null;
  due_date?: string | null;
}

export interface ActionItemPatch {
  title?: string;
  assignee?: string | null;
  due_date?: string | null;
  completed?: boolean;
}
