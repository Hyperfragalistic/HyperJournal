import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "HyperJournal — Hyperliquid Trading Journal & AI Coach",
    template: "%s | HyperJournal",
  },
  description:
    "Professional trading journal and AI coaching platform for Hyperliquid perpetuals. Track performance, analyze psychology, and grow with a voice-first AI coach.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  keywords: ["Hyperliquid", "trading journal", "AI coach", "perpetuals", "crypto trading"],
  authors: [{ name: "HyperJournal" }],
  openGraph: {
    type: "website",
    title: "HyperJournal",
    description: "AI-powered trading journal for Hyperliquid perpetuals",
    siteName: "HyperJournal",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1F1C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
