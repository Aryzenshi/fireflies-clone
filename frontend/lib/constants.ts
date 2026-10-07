/** Static UI configuration: navigation, placeholder routes and app strings. */

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  badge?: string;
  /** false when the route has a real implementation in this build */
  implemented: boolean;
}

export type IconName =
  | "home"
  | "meetings"
  | "status"
  | "playlist"
  | "upload"
  | "integrations"
  | "apps"
  | "topic"
  | "analytics"
  | "team"
  | "upgrade"
  | "settings"
  | "shield";

export interface NavSection {
  id: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    items: [
      { label: "Home", href: "/", icon: "home", implemented: true },
      { label: "Meetings", href: "/meetings", icon: "meetings", implemented: true },
      { label: "Meeting Status", href: "/coming-soon/meeting-status", icon: "status", implemented: false },
      { label: "Playlist", href: "/coming-soon/playlist", icon: "playlist", implemented: false },
      { label: "Uploads", href: "/uploads", icon: "upload", implemented: true },
    ],
  },
  {
    id: "insights",
    items: [
      { label: "Integrations", href: "/coming-soon/integrations", icon: "integrations", implemented: false },
      { label: "Apps", href: "/coming-soon/apps", icon: "apps", badge: "New", implemented: false },
      { label: "Topic Tracker", href: "/coming-soon/topic-tracker", icon: "topic", implemented: false },
      { label: "Analytics", href: "/coming-soon/analytics", icon: "analytics", implemented: false },
    ],
  },
  {
    id: "account",
    items: [
      { label: "Team", href: "/coming-soon/team", icon: "team", badge: "New", implemented: false },
      { label: "Upgrade", href: "/coming-soon/upgrade", icon: "upgrade", implemented: false },
      { label: "Settings", href: "/settings", icon: "settings", implemented: true },
      { label: "Platform Rules", href: "/coming-soon/platform-rules", icon: "shield", implemented: false },
    ],
  },
];

export const COMING_SOON_PAGES: Record<
  string,
  { title: string; description: string; note: string }
> = {
  "meeting-status": {
    title: "Meeting Status",
    description: "Live meeting bot status and recording health for upcoming calls.",
    note: "Joining live calls requires the Fireflies meeting bot, which is out of scope for this assignment build.",
  },
  playlist: {
    title: "Playlist",
    description: "Saved highlights and soundbites collected into shareable playlists.",
    note: "Highlights and soundbites are listed as bonus features in the assignment brief.",
  },
  integrations: {
    title: "Integrations",
    description: "Connect Zoom, Google Meet, Microsoft Teams, CRMs and calendars.",
    note: "Third-party integrations are explicitly mocked in the assignment brief.",
  },
  apps: {
    title: "Apps",
    description: "Workflow apps that act on your meeting notes automatically.",
    note: "Apps depend on the integrations platform, which is out of scope for this build.",
  },
  "topic-tracker": {
    title: "Topic Tracker",
    description: "Track how topics trend across every meeting in your workspace.",
    note: "Cross-meeting analytics beyond the seeded topics are a bonus feature.",
  },
  analytics: {
    title: "Analytics",
    description: "Speaking time, sentiment and participation analytics per team member.",
    note: "Analytics dashboards are a bonus feature in the assignment brief.",
  },
  team: {
    title: "Team",
    description: "Invite teammates, manage seats and control workspace access.",
    note: "Real team collaboration is out of scope; this build assumes one signed-in user.",
  },
  upgrade: {
    title: "Upgrade",
    description: "Plans, billing and usage limits for the workspace.",
    note: "Billing is out of scope. Usage counters in the top bar are derived from real transcript data.",
  },
  "platform-rules": {
    title: "Platform Rules",
    description: "Workspace policies for recording consent and data retention.",
    note: "Policy administration is out of scope for this assignment build.",
  },
};

export const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const;

/** Shown in the top bar so reviewers can see where usage numbers come from. */
export const USAGE_QUOTA_MINUTES = 800;

export const LIST_PAGE_SIZE = 100;
