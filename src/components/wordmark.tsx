import { WORDMARK_SVG, WORDMARK_VIEWBOX } from "./wordmark-paths";

/**
 * The Trade Side wordmark: Instrument Serif Italic in forest with one clay pen
 * stroke underneath. Inline so it follows the theme (forest turns sage in dark mode).
 */
export function Wordmark({ className = "h-7 w-auto", tone = "forest" }: { className?: string; tone?: "forest" | "on-forest" }) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      role="img"
      aria-label="The Trade Side"
      className={`${className} ${tone === "forest" ? "text-forest" : "text-on-forest"}`}
      dangerouslySetInnerHTML={{ __html: WORDMARK_SVG }}
    />
  );
}
