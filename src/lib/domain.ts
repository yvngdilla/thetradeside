import { getDomain, getHostname } from "tldts";

/**
 * Turns whatever someone pastes ("https://www.RH.com/trade?x=1", "trade.rh.com",
 * "rh.com") into the registrable domain ("rh.com"), so the same vendor is never
 * filed twice under slightly different spellings.
 */
export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const withScheme = /^[a-z]+:\/\//.test(raw) ? raw : `https://${raw}`;
  const host = getHostname(withScheme);
  if (!host) return null;
  const domain = getDomain(host);
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

/**
 * The full page someone pasted, cleaned up, when it's more than a bare domain
 * (like their trade program page). Null for a bare domain or home page.
 */
export function startingPage(input: string): string | null {
  const raw = input.trim();
  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.pathname === "/" || url.pathname === "") return null;
    url.hash = "";
    // Drop tracking parameters; keep anything else (some trade pages use ?page=).
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

/** Loose comparison key for vendor names: "Arteriors Home, Inc." -> "arteriorshome". */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company|the|home|furniture|furnishings)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}
