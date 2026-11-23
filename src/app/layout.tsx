import type { Metadata } from "next";
import localFont from "next/font/local";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

// Fraunces (variable, with its soft axis) for display; DM Sans for everything read or clicked;
// Caveat for the short handwritten notes. All three: SIL Open Font License 1.1.
const display = localFont({ src: "./fonts/Fraunces-Variable.woff2", weight: "100 900", variable: "--font-fraunces", display: "swap" });
const sans = localFont({
  src: [
    { path: "./fonts/DMSans-Variable.woff2", weight: "100 1000", style: "normal" },
    { path: "./fonts/DMSans-Italic-Variable.woff2", weight: "100 1000", style: "italic" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});
// Fraunces draws a very ornate ampersand, and vendor names are full of them ("Marlow & Pierce").
// This borrows the plain one from DM Sans wherever the display face is used.
const ampersand = localFont({
  src: "./fonts/DMSans-Variable.woff2",
  weight: "100 1000",
  variable: "--font-ampersand",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0026" }],
});
const hand = localFont({ src: "./fonts/Caveat-Variable.woff2", weight: "400 700", variable: "--font-caveat", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${hand.variable} ${ampersand.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
