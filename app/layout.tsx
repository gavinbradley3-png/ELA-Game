import type { Metadata, Viewport } from "next";
import { League_Spartan, Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const spartan = League_Spartan({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Receipts — Show Your Proof",
  description:
    "The live classroom ELA game where claims need evidence. Students read, annotate, submit receipts, vote, revise, and defend their thinking — the teacher runs the room.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spartan.variable} ${inter.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
