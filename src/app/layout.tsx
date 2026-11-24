import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../../design/tokens/agora.css";
import "./globals.css";
import { IconSprite } from "@/components/IconSprite";
import { getThemeChoice } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "AGΩRA", template: "%s · AGΩRA" },
  description: "Know where to be. Know who to meet.",
  icons: {
    icon: [
      { url: "/brand/agora-favicon.svg", type: "image/svg+xml" },
      { url: "/brand/png/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/brand/png/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Forum (voice), Source Sans 3 (text), IBM Plex Mono (event codes) — family names match agora.css.
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Forum&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await getThemeChoice();
  return (
    <html lang="en-US" data-theme={theme === "system" ? undefined : theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
