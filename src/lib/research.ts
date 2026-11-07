import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { structured } from "@/lib/llm";

// Finds how a vendor wants resale certificates submitted. Crawls the vendor's
// own site with Firecrawl, then has Claude read the relevant pages.

const FIRECRAWL = "https://api.firecrawl.dev/v2";

async function firecrawl<T>(endpoint: string, body: unknown, timeoutMs = 60000): Promise<T> {
  const res = await fetch(`${FIRECRAWL}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.firecrawlApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string } & T;
  if (!res.ok || json.success === false) {
    throw new Error(`Firecrawl ${endpoint} failed (${res.status}): ${json.error ?? "no details"}`);
  }
  return json;
}

type MapLink = string | { url: string; title?: string; description?: string };

async function mapSite(domain: string, search?: string): Promise<{ url: string; title: string }[]> {
  const res = await firecrawl<{ links?: MapLink[] }>("map", {
    url: `https://${domain}`,
    search,
    limit: search ? 50 : 400,
    includeSubdomains: true,
  });
  return (res.links ?? []).map((l) =>
    typeof l === "string" ? { url: l, title: "" } : { url: l.url, title: l.title ?? "" },
  );
}

async function scrape(url: string): Promise<{ url: string; markdown: string }> {
  const res = await firecrawl<{ data?: { markdown?: string } }>("scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: false,
    timeout: 45000,
  });
  return { url, markdown: res.data?.markdown ?? "" };
}

// Words that tend to appear in the URL or title of a vendor's trade program pages.
const SIGNALS: [RegExp, number][] = [
  [/to-?the-?trade|trade-?program|trade-?account|trade-?application|designer-?program|for-?the-?trade/i, 10],
  [/\btrade\b|designer|professional|\bpro\b|hospitality|commercial/i, 6],
  [/resale|tax-?exempt|exemption|wholesale|dealer|retailer|stockist/i, 6],
  [/apply|application|register|sign-?up|account/i, 3],
  [/contact|customer-?service|faq|help/i, 2],
  [/\.pdf$/i, 1],
];
const NOISE = /\/(products?|collections?|shop|cart|blog|news|press|careers|jobs)\/[^/]+\/.+/i;

function score(link: { url: string; title: string }): number {
  if (NOISE.test(link.url)) return 0;
  const text = `${link.url} ${link.title}`;
  return SIGNALS.reduce((sum, [re, w]) => (re.test(text) ? sum + w : sum), 0);
}

export const ResearchSchema = z.object({
  display_name: z.string().describe("The brand name designers know the vendor by, e.g. 'Arteriors'."),
  seller_name: z
    .string()
    .describe(
      "Name to write on the certificate's 'purchase from' line. Prefer the legal entity if the site shows one (footer copyright, terms page), e.g. 'Arteriors Home, Inc.'; otherwise the brand name.",
    ),
  method: z
    .enum(["email", "web_form", "portal_account", "contact_rep", "unknown"])
    .describe(
      "How to submit: email = send certificate to an address; web_form = an online trade application form with an upload or fields; portal_account = must create a login/account first; contact_rep = only through a sales rep or phone; unknown = no trade info found.",
    ),
  trade_email: z.string().nullable().describe("Email address for trade applications or resale certificates, only if shown on the site."),
  trade_url: z.string().nullable().describe("URL of the page describing the trade program."),
  application_url: z.string().nullable().describe("URL of the online application form or account sign-up, if any."),
  own_form_url: z
    .string()
    .nullable()
    .describe("URL of the vendor's own application or resale PDF if they require it instead of or in addition to the state form."),
  required_documents: z
    .array(z.string())
    .describe("Documents the vendor asks for, in plain words, e.g. 'California resale certificate', 'Business license', 'W-9', 'ASID or IIDA membership'."),
  product_categories: z.string().describe("Short plain description of what the vendor sells, e.g. 'lighting, furniture and decorative accessories'."),
  discount_info: z.string().nullable().describe("Trade discount or pricing terms if stated, e.g. '20% off retail'."),
  summary: z.string().describe("Two or three sentences a designer can act on: where to send the certificate and anything unusual."),
  confidence: z.enum(["high", "medium", "low"]).describe("high = trade instructions found on the site; low = guessed."),
  sources: z.array(z.string()).describe("URLs that support the answer."),
});
export type ResearchResult = z.infer<typeof ResearchSchema>;

const MAX_PAGE_CHARS = 14000;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export async function researchVendor(domain: string): Promise<ResearchResult> {
  const [targeted, all] = await Promise.all([
    mapSite(domain, "trade designer program resale").catch(() => []),
    mapSite(domain).catch(() => []),
  ]);

  const seen = new Set<string>();
  const candidates = [...targeted, ...all]
    .filter((l) => {
      const key = l.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((l) => ({ ...l, score: score(l) }))
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score);

  const toScrape = [`https://${domain}`, ...candidates.filter((c) => !/\.pdf$/i.test(c.url)).slice(0, 5).map((c) => c.url)];
  const pages = (await Promise.allSettled(toScrape.map(scrape)))
    .filter((r): r is PromiseFulfilledResult<{ url: string; markdown: string }> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((p) => p.markdown.trim().length > 0);

  if (pages.length === 0) throw new Error(`Couldn't read ${domain}. Check the domain, or add the details by hand.`);

  const emails = [...new Set(pages.flatMap((p) => p.markdown.match(EMAIL_RE) ?? []))]
    .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(e))
    .slice(0, 30);
  const pdfLinks = candidates.filter((c) => /\.pdf$/i.test(c.url)).slice(0, 10).map((c) => c.url);

  const prompt = [
    `Vendor domain: ${domain}`,
    `Other likely trade-related URLs on the site (not all were read):\n${candidates.slice(0, 25).map((c) => `- ${c.url}${c.title ? ` (${c.title})` : ""}`).join("\n") || "none found"}`,
    `PDF links found: ${pdfLinks.join(", ") || "none"}`,
    `Email addresses seen on the pages: ${emails.join(", ") || "none"}`,
    ...pages.map((p) => `--- PAGE ${p.url} ---\n${p.markdown.slice(0, MAX_PAGE_CHARS)}`),
  ].join("\n\n");

  return structured({
    system:
      "You help interior designers open trade accounts. Read a vendor's web pages and work out how the vendor wants a designer to submit a resale certificate and apply for trade pricing. Use only what the pages show. Never invent an email address or URL: if it is not in the pages or link lists, return null. Prefer a dedicated trade, designer or accounts email over a general info address, but a general customer service address is acceptable for email submission when nothing better exists and the site says to contact them for trade accounts.",
    prompt,
    schema: ResearchSchema,
    maxTokens: 2500,
  });
}

/** Suggest paragraph 5 of the certificate for this vendor. */
export function suggestDescription(productCategories: string, fallback: string): string {
  const clean = productCategories.trim().replace(/\.$/, "");
  if (!clean) return fallback;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
