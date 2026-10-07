import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "fireflies.ai — meeting notes & transcription workspace",
  description:
    "Original Fireflies.ai-inspired meeting workspace: meeting library, interactive transcripts with player sync, AI notes, action items and full CRUD. Built for the SDE fullstack assignment.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
