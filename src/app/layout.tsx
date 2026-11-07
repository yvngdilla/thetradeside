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

// Signature styles for typed electronic signatures (SIL Open Font License).
const sig1 = localFont({ src: "./fonts/mrs-saint-delafield-latin-400-normal.woff2", variable: "--font-sig-1", display: "block" });
const sig2 = localFont({ src: "./fonts/herr-von-muellerhoff-latin-400-normal.woff2", variable: "--font-sig-2", display: "block" });
const sig3 = localFont({ src: "./fonts/allura-latin-400-normal.woff2", variable: "--font-sig-3", display: "block" });

export const metadata: Metadata = {
  title: { default: `The ${APP_NAME}`, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${sig1.variable} ${sig2.variable} ${sig3.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
