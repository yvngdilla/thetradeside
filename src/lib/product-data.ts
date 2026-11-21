// Reads the product data a shop publishes in its page markup (schema.org
// JSON-LD and Open Graph tags). No network and no model: this is the exact
// part of a clip. Kept free of server-only imports so it can be tested alone
// and reused by a browser extension.

export interface ProductData {
  /** Flat facts found in the markup. Absent keys were not on the page. */
  product: {
    name?: string;
    brand?: string;
    sku?: string;
    description?: string;
    price?: number;
    currency?: string;
    availability?: string;
    material?: string;
    color?: string;
    site?: string;
  } | null;
  images: string[];
}

type Json = Record<string, unknown>;

const text = (v: unknown): string | undefined => {
  if (typeof v === "string") return decode(v).trim() || undefined;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && "name" in v) return text((v as Json).name);
  return undefined;
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function absolute(u: string, base: string): string | null {
  try {
    const url = new URL(decode(u), base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Every JSON-LD node on the page, with @graph containers opened up. */
function jsonLdNodes(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      const walk = (v: unknown) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          out.push(v as Json);
          if (Array.isArray((v as Json)["@graph"])) walk((v as Json)["@graph"]);
        }
      };
      walk(JSON.parse(m[1].trim()));
    } catch {
      // Malformed block: skip it, other blocks may still parse.
    }
  }
  return out;
}

const isType = (node: Json, type: string) => {
  const t = node["@type"];
  return Array.isArray(t) ? t.includes(type) : t === type;
};

function meta(html: string, key: string): string | undefined {
  const tag = new RegExp(`<meta[^>]*(?:property|name)=["']${key}["'][^>]*>`, "i").exec(html)?.[0];
  const content = tag && /content=["']([^"']*)["']/i.exec(tag)?.[1];
  return content ? decode(content).trim() || undefined : undefined;
}

function images(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(images);
  if (v && typeof v === "object") return images((v as Json).url ?? (v as Json).contentUrl);
  return [];
}

export function readProductData(html: string, pageUrl: string): ProductData {
  if (!html) return { product: null, images: [] };
  const nodes = jsonLdNodes(html);
  const node = nodes.find((n) => isType(n, "Product")) ?? nodes.find((n) => isType(n, "ProductGroup"));

  // offers can be one Offer, a list, or an AggregateOffer with a price range.
  const offers = node ? (Array.isArray(node.offers) ? (node.offers as Json[]) : node.offers ? [node.offers as Json] : []) : [];
  const offer = offers[0];
  const price = offer ? num(offer.price) ?? num(offer.lowPrice) ?? num((offer.priceSpecification as Json | undefined)?.price) : undefined;

  const product = {
    name: text(node?.name) ?? meta(html, "og:title"),
    brand: text(node?.brand) ?? text(node?.manufacturer),
    sku: text(node?.sku) ?? text(node?.mpn),
    description: text(node?.description) ?? meta(html, "og:description"),
    price: price ?? num(meta(html, "product:price:amount")) ?? num(meta(html, "og:price:amount")),
    currency: text(offer?.priceCurrency) ?? meta(html, "product:price:currency") ?? meta(html, "og:price:currency"),
    availability: text(offer?.availability)?.replace(/^https?:\/\/schema\.org\//, ""),
    material: text(node?.material),
    color: text(node?.color),
    site: meta(html, "og:site_name"),
  };
  const found = Object.fromEntries(Object.entries(product).filter(([, v]) => v !== undefined)) as NonNullable<ProductData["product"]>;

  const imgs = [...images(node?.image), ...(meta(html, "og:image") ? [meta(html, "og:image")!] : [])]
    .map((u) => absolute(u, pageUrl))
    .filter((u): u is string => Boolean(u));

  return { product: Object.keys(found).length ? found : null, images: [...new Set(imgs)] };
}

/** Rough readable text from page source, for when there is no markdown version of the page. */
export function htmlToText(html: string): string {
  const withImages = html.replace(/<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi, " ![]($1) ");
  return decode(
    withImages
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|dd|dt)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
