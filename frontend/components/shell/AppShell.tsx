"use client";

import { useEffect, useState } from "react";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { ToastProvider, useToast } from "@/hooks/useToast";
import { ChatIcon } from "@/components/icons";

import { usePathname } from "next/navigation";

function FloatingChatButton() {
  const { info } = useToast();
  const pathname = usePathname();
  const isMeeting = Boolean(pathname?.startsWith("/meetings/"));

  return (
    <button
      type="button"
      onClick={() => info("AI Assistant", "Chat is a placeholder in this build.")}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#4638f3] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 ${
        isMeeting ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <ChatIcon size={18} /> Chat
    </button>
  );
}

/**
 * Fixed sidebar + top bar + scrollable content area, matching the reference app.
 *
 * The sidebar is rendered exactly once: it stays in the layout from `md` up and
 * becomes an overlay drawer on smaller screens. Keeping a single instance means
 * only one `complementary`/`Primary` landmark and one copy of every link exists
 * in the DOM, so assistive tech and automation cannot pick the wrong one.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  // Escape closes the drawer, and it never stays open when the viewport grows.
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (query.matches) setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    query.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      query.removeEventListener("change", onChange);
    };
  }, [navOpen]);

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-app">
        <div
          className={
            navOpen
              ? "fixed inset-y-0 left-0 z-50 flex shadow-2xl md:hidden"
              : "hidden md:flex"
          }
        >
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </div>

        {navOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setNavOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSidebar={() => setNavOpen(true)} navOpen={navOpen} />
          <main className="scroll-area min-h-0 flex-1 bg-canvas">{children}</main>
        </div>
      </div>
      <FloatingChatButton />
      <ToastViewport />
    </ToastProvider>
  );
}
