import "server-only";
import { z } from "zod";
import { scrape } from "@/lib/firecrawl";
import { structured } from "@/lib/llm";
import { readProductData, htmlToText, mainText, markdownImages, embeddedData, type PageImage } from "@/lib/product-data";

// Turns a product page into one item. The page's own structured data (the
// part a shop publishes for search engines) is read first because it is exact;
// Claude then reads the page text for what structured data leaves out, like
// dimensions, finish and lead time.

export const ClipSchema = z.object({
  is_product_page: z.boolean().describe("False when the page is a category, search result, article or anything other than one product."),
  name: z.string().describe("Product name as the vendor writes it, without the brand, e.g. 'Poole Outdoor End Table'. Empty if not a product page."),
  maker: z.string().describe("Brand or maker of the product. Often the site itself; on a retailer's site it is the brand shown with the product. Empty if not shown."),
  sku: z.string().nullable().describe("SKU, item number or model number shown on the page."),
  description: z.string().nullable().describe("One or two plain sentences saying what the item is, in the vendor's terms. No marketing language."),
  dimensions: z
    .string()
    .nullable()
    .describe("Overall dimensions exactly as shown, with units, e.g. '22\" W x 22\" D x 20\" H'. For rugs, fabric and tile, the size of the selected option. Null if the page shows none."),
  material: z.string().nullable().describe("What it is made of, e.g. 'Cast concrete' or '100% wool pile, cotton backing'."),
  finish: z.string().nullable().describe("Finish of the selected option, e.g. 'Antique brass' or 'Honed'."),
  color: z.string().nullable().describe("Color or colorway of the selected option."),
  lead_time: z.string().nullable().describe("Lead time or availability exactly as shown, e.g. 'In stock', '6 to 8 weeks'."),
  retail_price: z
    .number()
    .nullable()
    .describe(
      "Regular list price for one unit of the selected option, as a number. When the item is on sale, this is the regular price, not the sale price. For tile, fabric and wallcovering, the price per square foot, yard or roll when the page shows one, rather than per piece or per box. Null if the page shows no price or says to sign in or inquire.",
    ),
  trade_price: z
    .number()
    .nullable()
    .describe("Only when the page explicitly shows a separate trade, designer or member price for the signed-in account. Never calculate it. Otherwise null."),
  currency: z.string().describe("ISO currency code of the prices, e.g. 'USD'."),
  unit: z
    .enum(["each", "pair", "set", "yard", "square foot", "roll", "box"])
    .describe("What one unit of retail_price buys. With no price shown, how the item is sold: fabric by the yard, wallcovering by the roll or yard, tile by the square foot or box."),
  price_note: z
    .string()
    .nullable()
    .describe(
      "One short sentence when the price needs a caveat: 'On sale for 1,799 until further notice', 'Sold by the box of 20 tiles (5 sq ft) at 99.25', 'Price varies by size, from 1,200 to 3,400', 'No finish selected, price is for the first option', 'Price shows after trade sign-in', 'Minimum order 10 sq ft'. Otherwise null.",
    ),
  images: z
    .array(z.string())
    .describe(
      "URLs of photos of this product, best first, chosen only from the candidate list. Leave out logos, icons, and any photo whose caption names a different product (related items, 'you may also like'). Empty when no candidate shows this product. At most 8.",
    ),
});
export type ClipResult = z.infer<typeof ClipSchema>;

const MAX_PAGE_CHARS = 40000;
const MAX_EMBEDDED_CHARS = 16000;
/** Under this much readable text, the page likely keeps its facts in scripts. */
const THIN_PAGE_CHARS = 4000;

export interface ClipInput {
  url: string;
  /** Page source, when the caller already has it (a browser extension reading the page the designer is signed in to). */
  html?: string;
}

/** Reads one product page. Throws when the page can't be read or isn't a product. */
export async function clipItem(input: ClipInput): Promise<ClipResult> {
  let html = input.html ?? "";
  let markdown: string;
  if (html) {
    markdown = htmlToText(html);
  } else {
    const page = await scrape(input.url, { html: true });
    html = page.html;
    markdown = page.markdown;
  }
  if (!markdown.trim()) throw new Error("That page came back empty. Check the link, or add the item by hand.");

  const data = readProductData(html, input.url);
  const main = mainText(markdown, data.product?.name, MAX_PAGE_CHARS);
  const fromMarkup = data.images.map((url) => ({ url, alt: "" }));
  let candidates = imageCandidates([...fromMarkup, ...main.images]);
  if (candidates.length < 4) candidates = imageCandidates([...candidates, ...markdownImages(markdown)]);
  const sku = new URL(input.url).pathname.split("/").filter(Boolean).pop();
  const embedded = main.text.length < THIN_PAGE_CHARS ? embeddedData(html, [data.product?.sku, sku, data.product?.name], MAX_EMBEDDED_CHARS) : "";

  const result = await structured({
    system:
      "You help interior designers record products they are specifying. Read one product page and return the details of the product, for the option currently selected on the page. Use only what the page shows. Never invent a price, a dimension, a SKU or a lead time: if the page does not show it, return null. Copy dimensions and lead times as written. The structured data block comes from the page's own markup and is exact: prefer it over the page text when they disagree about name, brand or SKU. Its price is what the shop charges today, which can be a sale price or the price of one piece: check it against the page text. Mention a sale only when the page shows both a regular price and a lower sale price. When the page offers options (size, finish, fabric) and none is selected, describe the option the structured data names, or else the first one listed, keep SKU, finish and price to that same option, and say so in price_note.",
    prompt: [
      `Page URL: ${input.url}`,
      `Structured data from the page markup:\n${JSON.stringify(data.product ?? {}, null, 1)}`,
      `Image candidates (address, then the page's caption for it when there is one):\n${candidates.map((c) => `- ${c.url}${c.alt ? ` | ${c.alt}` : ""}`).join("\n") || "none"}`,
      embedded ? `Product data from the page's scripts (raw, may be cut off):\n${embedded}` : "",
      `--- PAGE TEXT ---\n${main.text}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    schema: ClipSchema,
    maxTokens: 2000,
  });

  if (!result.is_product_page) throw new Error("That link doesn't look like a single product page. Open the product itself and paste that link.");

  // Only keep image URLs that really are on the page. When none were chosen,
  // fall back to the photos the page's own markup names for this product.
  const allowed = new Set(candidates.map((c) => c.url));
  const images = result.images.filter((u) => allowed.has(u));
  return { ...result, images: images.length ? images : data.images.slice(0, 4) };
}

function imageCandidates(found: PageImage[]): PageImage[] {
  const seen = new Set<string>();
  return found
    .filter((c) => !/\.svg(\?|$)|sprite|icon|logo|favicon|placeholder|1x1|pixel|swatch|badge/i.test(c.url))
    .filter((c) => !seen.has(c.url) && seen.add(c.url))
    .slice(0, 40);
}
