import type { Metadata } from "next";
import localFont from "next/font/local";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

// Instrument Serif (400, roman and italic) for display; Instrument Sans for everything read or clicked.
const serif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});
const sans = localFont({
  src: [
    { path: "./fonts/InstrumentSans-Variable.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/InstrumentSans-Italic-Variable.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-instrument-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `The ${APP_NAME}`, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
