/**
 * Original inline icon set (1.75px stroke, 24x24 grid) so the app has no
 * external icon dependency and no proprietary assets.
 */

import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />
  </Icon>
);

export const MeetingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="M16 10.5 21 8v8l-5-2.5z" />
  </Icon>
);

export const StatusIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8.5v4l2.5 1.8" />
  </Icon>
);

export const PlaylistIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h10M4 11h10M4 16h6" />
    <path d="M16 16.5V8l4 1.5" />
    <circle cx="14.5" cy="17.5" r="2" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V5" />
    <path d="m8 8.5 4-3.5 4 3.5" />
    <path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
  </Icon>
);

export const IntegrationsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h7M15 6.5h5" />
    <rect x="13" y="4" width="4" height="5" rx="1.2" />
    <path d="M4 17.5h5M13 17.5h7" />
    <rect x="6" y="15" width="4" height="5" rx="1.2" />
  </Icon>
);

export const AppsIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </Icon>
);

export const TopicIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />
  </Icon>
);

export const AnalyticsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const TeamIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 7.5a2.5 2.5 0 1 1 0 5M17 19a5.4 5.4 0 0 0-1.2-3.4" />
  </Icon>
);

export const UpgradeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8z" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21.4 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 5 6v5.5c0 4 2.9 7.2 7 8.9 4.1-1.7 7-4.9 7-8.9V6z" />
    <path d="m9.5 12 1.8 1.8 3.4-3.6" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
);

export const FilterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.2" />
    <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 14.5 6-6 6 6" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9 7V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
    <path d="M6.5 7l.8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12" />
    <path d="M10.5 11v6M13.5 11v6" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 6.5V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1.5" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1 1" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1-1" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11" />
    <path d="m8 11.5 4 3.5 4-3.5" />
    <path d="M5 19h14" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const RewindIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 6 4 12l7 6z" />
    <path d="M20 6l-7 6 7 6z" />
  </Icon>
);

export const ForwardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 6l7 6-7 6z" />
    <path d="M4 6l7 6-7 6z" />
  </Icon>
);

export const SparklesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
    <path d="M17.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </Icon>
);

export const RefreshIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h13" />
    <path d="m13 6.5 5.5 5.5-5.5 5.5" />
  </Icon>
);

export const FileTextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h7.5L18.5 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M13 3.5V8h4.5M8.5 12.5h7M8.5 16h5" />
  </Icon>
);

export const VideoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 11 6-3v8l-6-3z" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.4 3.4 8.5S14.3 18.1 12 20.5c-2.3-2.4-3.4-5.4-3.4-8.5S9.7 5.9 12 3.5z" />
  </Icon>
);

export const HelpIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.8 9.5a2.3 2.3 0 1 1 3.6 2.6c-.8.5-1.4 1-1.4 2" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const ExpandIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
  </Icon>
);

export const CollapseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5" />
  </Icon>
);

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const SoundbiteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h2.5l1.5-5 2.5 10 2.5-13 2.5 16 2-8H20" />
  </Icon>
);

export const WaveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h1.5M8 8v8M12 5v14M16 8.5v7M20 11v2" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4.5 3 19.5h18z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 3 .8 4.4 1.5 5.3H5c.7-.9 1.5-2.3 1.5-5.3z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const SlackIcon = (p: IconProps) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="#E01E5A" d="M5.8 15.2a2 2 0 1 1-2-2h2zM6.8 15.2a2 2 0 0 1 4 0v5a2 2 0 1 1-4 0z" />
    <path fill="#36C5F0" d="M8.8 5.8a2 2 0 1 1 2-2v2zM8.8 6.8a2 2 0 0 1 0 4h-5a2 2 0 1 1 0-4z" />
    <path fill="#2EB67D" d="M18.2 8.8a2 2 0 1 1 2 2h-2zM17.2 8.8a2 2 0 0 1-4 0v-5a2 2 0 1 1 4 0z" />
    <path fill="#ECB22E" d="M15.2 18.2a2 2 0 1 1-2 2v-2zM15.2 17.2a2 2 0 0 1 0-4h5a2 2 0 1 1 0 4z" />
  </svg>
);

export const GoogleIcon = (p: IconProps) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path
      fill="#4285F4"
      d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
    />
    <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
    <path
      fill="#EA4335"
      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"
    />
  </svg>
);

export const LogoMark = ({ size = 26 }: { size?: number }) => (
  <img
    src="/icon.png"
    alt="Fireflies.ai"
    width={size}
    height={size}
    className="shrink-0 object-contain rounded"
  />
);

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5a9.6 9.6 0 0 1-2.6-.35L5 20.5l1.2-3.3A6.3 6.3 0 0 1 4 12.5C4 8.9 7.6 6 12 6s8 2.9 8 6.5Z" />
  </Icon>
);
