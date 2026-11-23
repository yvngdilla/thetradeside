import { APP_NAME } from "@/lib/brand";

/**
 * Trade Side wordmark: the name in Fraunces beside a small cut-paper dot.
 * Set the size with a text-size class; the dot follows it.
 */
export function Wordmark({ className = "text-[23px]", dot = "terracotta" }: { className?: string; dot?: "terracotta" | "ink" }) {
  return (
    <span className={`font-display inline-flex items-center gap-[0.4em] leading-none font-medium tracking-[-0.02em] text-ink ${className}`}>
      <svg aria-hidden viewBox="0 0 100 100" className={`h-[0.95em] w-[0.95em] ${dot === "ink" ? "text-ink" : "text-terracotta"}`}>
        <path d="M50 8 C 78 4, 96 28, 92 54 C 88 82, 62 98, 36 92 C 12 86, 2 60, 8 36 C 13 18, 30 10, 50 8 Z" fill="currentColor" />
      </svg>
      {APP_NAME}
    </span>
  );
}
