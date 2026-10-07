import type { ReactNode } from "react";

type Tone = "neutral" | "purple" | "green" | "orange" | "danger" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted border-border",
  purple: "bg-primary-soft text-primary-hover border-primary-border",
  green: "bg-success-soft text-success border-[#cdeadb]",
  orange: "bg-accent-orange-soft text-[#b4671f] border-[#f6ddbe]",
  danger: "bg-danger-soft text-danger border-[#f6d3d7]",
  dark: "bg-ink text-white border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
  size = "sm",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "px-1.5 py-[1px] text-[10px]" : "px-2 py-[2px] text-[11px]",
        TONES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
