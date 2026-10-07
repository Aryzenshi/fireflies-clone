"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  description?: string;
  onSelect: () => void;
}

/**
 * Small click-outside aware popover used for row menus, filter chips and the
 * profile menu.
 */
export function Dropdown({
  trigger,
  items,
  align = "right",
  width = 200,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  width?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open ? (
        <div
          role="menu"
          aria-label={label}
          style={{ width }}
          className={`animate-pop-in absolute z-40 mt-1 overflow-hidden rounded-[10px] border border-border bg-white p-1 shadow-pop ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                item.destructive ? "text-danger hover:bg-danger-soft" : "text-ink-soft hover:bg-surface-muted"
              }`}
            >
              {item.icon ? <span className="flex text-muted">{item.icon}</span> : null}
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.description ? (
                  <span className="block truncate text-[11px] text-muted">{item.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
