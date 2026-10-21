import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Absolute URLs for link previews (Messenger needs full https links).
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Secret Santa 2026",
  description:
    "Wrap your box, fill it with wishes, and join the family under the tree.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Secret Santa 2026",
    description:
      "Wrap your box, fill it with wishes, and join the family under the tree.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#782b28",
  width: "device-width",
  initialScale: 1,
};

// Fonts load from Google Fonts, one stylesheet per family so a missing family
// can't break the others. Fallbacks in tokens.css keep text readable.
const FONT_FAMILIES = [
  "DM+Sans:wght@400;600",
  "Special+Elite",
  "Pinyon+Script",
  "Libertinus+Serif+Display",
  "Libertinus+Serif",
];
const fontUrl = (f: string) =>
  `https://fonts.googleapis.com/css2?family=${f}&display=swap`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {FONT_FAMILIES.map((f) => (
          <link key={f} rel="stylesheet" href={fontUrl(f)} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
