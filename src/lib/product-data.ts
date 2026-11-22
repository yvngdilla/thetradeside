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
    /** What the shop charges today for the first or selected option. May be a sale price. */
    price?: number;
    currency?: string;
    /** Price per unit of measure when the shop publishes one, e.g. 19.08 per "sqft" for tile sold by the box. */
    unit_price?: number;
    unit_price_per?: string;
    /** Set when the page lists several options: how many, and the name of the one the other facts here describe. */
    option?: string;
    option_count?: number;
    price_low?: number;
    price_high?: number;
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
    if (!/^https?:$/.test(url.protocol)) return null;
    // A secure page cannot show a photo from an insecure address.
    if (base.startsWith("https:")) url.protocol = "https:";
    return url.href;
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

const list = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : v && typeof v === "object" ? [v as Json] : []);

const offerPrice = (o: Json | undefined) =>
  o ? num(o.price) ?? num(o.lowPrice) ?? num((o.priceSpecification as Json | undefined)?.price) : undefined;

export function readProductData(html: string, pageUrl: string): ProductData {
  if (!html) return { product: null, images: [] };
  const nodes = jsonLdNodes(html);
  const group = nodes.find((n) => isType(n, "ProductGroup"));
  const node = nodes.find((n) => isType(n, "Product") && !isType(n, "ProductGroup")) ?? group;

  // A product with options publishes them as variants of a group, as a list of
  // offers, or both. The option in the link (?variant=, ?selected_product=) is
  // the selected one; otherwise the first.
  const variants = list(group?.hasVariant ?? node?.hasVariant);
  const picked = [...new URL(pageUrl).searchParams.values()].filter((v) => v.length > 3);
  const isPicked = (o: Json) => picked.some((id) => [o.url, o["@id"], o.sku].some((f) => typeof f === "string" && f.includes(id)));
  const variant = variants.find(isPicked) ?? variants[0];

  // offers can be one Offer, a list, or an AggregateOffer with a price range.
  const offers = list(node?.offers).length ? list(node?.offers) : list(variant?.offers);
  const offer = offers.find(isPicked) ?? offers[0];
  const price = offerPrice(offer);

  const optionPrices = (variants.length > 1 ? variants.map((v) => offerPrice(list(v.offers)[0])) : offers.map(offerPrice)).filter(
    (n): n is number => n !== undefined,
  );
  const aggregateHigh = num(offer?.highPrice);
  if (aggregateHigh) optionPrices.push(aggregateHigh, ...(num(offer?.lowPrice) ? [num(offer?.lowPrice)!] : []));
  const low = optionPrices.length ? Math.min(...optionPrices) : undefined;
  const high = optionPrices.length ? Math.max(...optionPrices) : undefined;

  const unitSpec = list(offer?.priceSpecification).find((s) => (s.referenceQuantity as Json | undefined)?.unitText ?? s.unitText ?? s.unitCode);
  const unitRef = unitSpec?.referenceQuantity as Json | undefined;

  const product = {
    name: text(node?.name) ?? meta(html, "og:title"),
    brand: text(node?.brand) ?? text(node?.manufacturer),
    sku: text(node?.sku) ?? text(offer?.sku) ?? text(variant?.sku) ?? text(node?.mpn),
    description: text(node?.description) ?? meta(html, "og:description"),
    price: price ?? num(meta(html, "product:price:amount")) ?? num(meta(html, "og:price:amount")),
    currency: text(offer?.priceCurrency) ?? meta(html, "product:price:currency") ?? meta(html, "og:price:currency"),
    unit_price: unitSpec ? num(unitSpec.price) : undefined,
    unit_price_per: unitSpec ? text(unitRef?.unitText) ?? text(unitSpec.unitText) ?? text(unitSpec.unitCode) : undefined,
    option: Math.max(variants.length, offers.length) > 1 ? text(offer?.name) ?? text(variant?.name) : undefined,
    option_count: Math.max(variants.length, offers.length) > 1 ? Math.max(variants.length, offers.length) : undefined,
    price_low: low !== undefined && high !== undefined && low < high ? low : undefined,
    price_high: low !== undefined && high !== undefined && low < high ? high : undefined,
    availability: text(offer?.availability)?.replace(/^https?:\/\/schema\.org\//, ""),
    material: text(node?.material),
    color: text(node?.color),
    site: meta(html, "og:site_name"),
  };
  const found = Object.fromEntries(Object.entries(product).filter(([, v]) => v !== undefined)) as NonNullable<ProductData["product"]>;

  const imgs = [...images(node?.image), ...images(variant?.image), ...(meta(html, "og:image") ? [meta(html, "og:image")!] : [])]
    .map((u) => absolute(u, pageUrl))
    .filter((u): u is string => Boolean(u));

  return { product: Object.keys(found).length ? found : null, images: [...new Set(imgs)] };
}

/** Rough readable text from page source, for when there is no markdown version of the page. */
export function htmlToText(html: string): string {
  const withImages = html.replace(/<img[^>]*\ssrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi, " ![]($1) ");
  return decode(
    withImages
      .replace(/<(script|style|noscript|svg|template|nav|footer)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<h1[^>]*>/gi, "\n# ")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|dd|dt)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const MD_IMAGE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;

export interface PageImage {
  url: string;
  /** The page's own caption for the image, which says whose photo it is. */
  alt: string;
}

/** Every image in a page's markdown, in page order. */
export const markdownImages = (markdown: string): PageImage[] => [...markdown.matchAll(MD_IMAGE)].map((m) => ({ url: m[2], alt: m[1].trim() }));

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);

/**
 * The part of a page that is about the product, as plain text. A shop page
 * opens with its whole menu, often longer than the product itself, so reading
 * from the top would spend the budget on navigation. This starts just above the
 * product's own heading and drops link targets and images, which carry no facts.
 * `images` are the photos found in that same part of the page, in page order.
 */
export function mainText(markdown: string, name: string | undefined, maxChars: number): { text: string; images: PageImage[] } {
  const lines = markdown.split("\n");
  const wanted = words(name ?? "");
  const headings = lines.flatMap((l, i) => (/^#\s+\S/.test(l) ? [i] : []));
  const matches = (i: number) => [...words(lines[i])].some((w) => wanted.has(w));
  // With no heading that names the product, read from the top: a wrong start loses the product.
  const at = wanted.size ? headings.find(matches) : headings[0];
  // Price and breadcrumb often sit a few lines above the heading.
  const body = lines.slice(Math.max(0, (at ?? 0) - 12)).join("\n");
  const text = body
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, maxChars);
  return { text, images: markdownImages(body) };
}

/**
 * Product facts that an app-style site keeps in its scripts instead of its
 * visible page (specs inside closed panels, for instance). Returns the stretch
 * of that data around the product's own record, found by its name or number.
 */
export function embeddedData(html: string, hints: (string | undefined)[], maxChars: number): string {
  const chunks: string[] = [];
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      chunks.push(JSON.parse(m[1]) as string);
    } catch {
      // A chunk that does not parse is skipped; the rest still read.
    }
  }
  for (const m of html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) chunks.push(m[1]);
  if (!chunks.length) return "";

  const data = decode(chunks.join("\n"))
    .replace(/"[\w-]+":(?:null|""|\[\]|\{\}|false),?/g, "")
    .replace(/https?:\/\/[^"\\\s]+/g, "")
    .replace(/"id":\d+,?/g, "");
  // The record itself holds the name or number as a whole value, not inside a
  // sentence. Routing data repeats it too, so take the place with the most facts after it.
  const lower = data.toLowerCase();
  const facts = (i: number) => data.slice(i, i + 3000).match(/"[\w-]+":"[^"]/g)?.length ?? 0;
  for (const hint of hints) {
    const h = hint?.trim().toLowerCase();
    if (!h || h.length < 3) continue;
    const places: number[] = [];
    for (let i = lower.indexOf(`:"${h}"`); i >= 0 && places.length < 30; i = lower.indexOf(`:"${h}"`, i + 1)) places.push(i);
    if (!places.length) continue;
    const best = places.reduce((a, b) => (facts(b) > facts(a) ? b : a));
    // The number can sit anywhere in its record, so read on both sides of it.
    const from = Math.max(0, best - Math.floor(maxChars / 2));
    return data.slice(from, from + maxChars);
  }
  return "";
}
