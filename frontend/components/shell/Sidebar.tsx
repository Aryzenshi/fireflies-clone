"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AnalyticsIcon,
  AppsIcon,
  HomeIcon,
  IntegrationsIcon,
  LogoMark,
  MeetingsIcon,
  PlaylistIcon,
  SettingsIcon,
  ShieldIcon,
  StatusIcon,
  TeamIcon,
  TopicIcon,
  UploadIcon,
  UpgradeIcon,
  type IconProps,
} from "@/components/icons";
import { NAV_SECTIONS, type IconName, type NavItem } from "@/lib/constants";
import { useToast } from "@/hooks/useToast";

const ICONS: Record<IconName, (props: IconProps) => React.ReactElement> = {
  home: HomeIcon,
  meetings: MeetingsIcon,
  status: StatusIcon,
  playlist: PlaylistIcon,
  upload: UploadIcon,
  integrations: IntegrationsIcon,
  apps: AppsIcon,
  topic: TopicIcon,
  analytics: AnalyticsIcon,
  team: TeamIcon,
  upgrade: UpgradeIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.href === "/meetings") return pathname.startsWith("/meetings");
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { info } = useToast();

  return (
    <aside id="app-sidebar" aria-label="Primary navigation" className="flex h-full w-[220px] shrink-0 flex-col bg-sidebar text-sidebar-text">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-[52px] shrink-0 items-center gap-2 px-5 mt-[10px]"
        aria-label="fireflies.ai home"
      >
        <LogoMark size={28} />
        <span className="text-[18.5px] font-semibold font-heading tracking-tight text-white">
          fireflies.ai
        </span>
      </Link>

      <nav className="scroll-area scroll-area-dark flex-1 px-2 py-2" aria-label="Primary">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.id} className={sectionIndex === 0 ? "flex flex-col gap-0.5" : "mt-2 flex flex-col gap-0.5 border-t border-white/8 pt-2"}>
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative flex items-center gap-3 px-3 py-2 text-[13px] leading-tight transition-colors",
                    active
                      ? "bg-sidebar-active font-medium text-white border-r-[5px] border-[#6d71f0]"
                      : "text-sidebar-text/90 hover:bg-sidebar-hover",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  <span className="min-w-0 shrink truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-primary px-1.5 py-[2px] text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 mt-auto">
        <div className="border-t border-white/10 bg-white/5 p-4 rounded-none">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-[13px]">
              🪙
            </span>
            <span className="text-[11.5px] font-semibold text-white">Refer and get 3 credits</span>
          </div>
          <p className="mt-1 text-[10.5px] leading-snug text-sidebar-muted">
            Get 3 credits when someone signs up using your referral link.
          </p>
          <button
            type="button"
            onClick={() => info("Referral link copied", "Sharing is a placeholder in this build.")}
            className="mt-2 h-[26px] w-full rounded-sm bg-primary text-[11.5px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Refer
          </button>
        </div>
      </div>
    </aside>
  );
}
