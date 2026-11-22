import "server-only";
import { env } from "@/lib/env";

// The one Firecrawl client. Vendor research and item clipping both read pages
// through here.

const FIRECRAWL = "https://api.firecrawl.dev/v2";

const RATE_LIMIT_WAITS_MS = [15000, 30000];

export async function firecrawl<T>(endpoint: string, body: unknown, timeoutMs = 60000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${FIRECRAWL}/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.firecrawlApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // The plan allows a set number of reads a minute. A short wait clears it.
    if (res.status === 429 && attempt < RATE_LIMIT_WAITS_MS.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_WAITS_MS[attempt]));
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & T;
    if (!res.ok || json.success === false) {
      throw new Error(`Firecrawl ${endpoint} failed (${res.status}): ${json.error ?? "no details"}`);
    }
    return json;
  }
}

/** Reads one page as markdown. With `html`, also returns the page source (for structured product data). */
export async function scrape(url: string, opts?: { html?: boolean }): Promise<{ url: string; markdown: string; html: string }> {
  const res = await firecrawl<{ data?: { markdown?: string; rawHtml?: string } }>("scrape", {
    url,
    formats: opts?.html ? ["markdown", "rawHtml"] : ["markdown"],
    onlyMainContent: false,
    timeout: 45000,
  });
  return { url, markdown: res.data?.markdown ?? "", html: res.data?.rawHtml ?? "" };
}
