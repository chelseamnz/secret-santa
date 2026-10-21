import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../player.css";

export const metadata: Metadata = {
  title: "Secret Santa 2026",
  robots: { index: false, follow: false },
  // Same preview for everyone — no names, so a forwarded link leaks nothing.
  openGraph: {
    title: "Secret Santa 2026",
    description: "Wrap your box, fill it with wishes, and join the family under the tree.",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return children;
}
