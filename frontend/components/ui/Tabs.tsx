"use client";

import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: ReactNode;
}

export function Tabs({
  items,
  active,
  onChange,
  className = "",
  size = "md",
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className={`flex items-center gap-5 border-b border-border ${className}`}>
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={[
              "relative -mb-px flex items-center gap-1.5 border-b-2 font-medium transition-colors",
              size === "sm" ? "pb-2 text-[12.5px]" : "pb-2.5 text-[13px]",
              selected
                ? "border-primary text-primary-hover"
                : "border-transparent text-muted hover:text-ink-soft",
            ].join(" ")}
          >
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}
