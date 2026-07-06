import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";

const headline = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Receipts — Bring the Evidence",
  description:
    "The live classroom evidence battle. Students read, annotate, make claims, bring the receipts, judge the jury round, and revise — teacher runs the room.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={headline.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
