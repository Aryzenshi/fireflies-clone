import type { Metadata } from "next";

import { Inter, DM_Sans } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
