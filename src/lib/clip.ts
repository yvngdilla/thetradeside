import "server-only";
import { z } from "zod";
import { scrape } from "@/lib/firecrawl";
import { structured } from "@/lib/llm";
import { readProductData, htmlToText, type ProductData } from "@/lib/product-data";

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
  retail_price: z.number().nullable().describe("List price for one unit of the selected option, as a number. Null if the page shows no price or says to inquire."),
  trade_price: z
    .number()
    .nullable()
    .describe("Only when the page explicitly shows a separate trade, designer or member price for the signed-in account. Never calculate it. Otherwise null."),
  currency: z.string().describe("ISO currency code of the prices, e.g. 'USD'."),
  unit: z.enum(["each", "pair", "set", "yard", "square foot", "roll", "box"]).describe("What one unit of the price buys."),
  price_note: z.string().nullable().describe("One short sentence when the price needs a caveat: 'Price on request', 'Price varies by size', 'Trade price shows after sign-in'. Otherwise null."),
  images: z.array(z.string()).describe("URLs of photos of this product, best first, chosen only from the candidate list. Leave out logos, icons, swatches of other products and lifestyle shots of other items. At most 8."),
});
export type ClipResult = z.infer<typeof ClipSchema>;

const MAX_PAGE_CHARS = 24000;
const MD_IMAGE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;

export interface ClipInput {
  url: string;
  /** Page source, when the caller already has it (a browser extension reading the page the designer is signed in to). */
  html?: string;
}

/** Reads one product page. Throws when the page can't be read or isn't a product. */
export async function clipItem(input: ClipInput): Promise<ClipResult> {
  let html = input.html ?? "";
  let text: string;
  if (html) {
    text = htmlToText(html);
  } else {
    const page = await scrape(input.url, { html: true });
    html = page.html;
    text = page.markdown;
  }
  if (!text.trim()) throw new Error("That page came back empty. Check the link, or add the item by hand.");

  const data = readProductData(html, input.url);
  const candidates = imageCandidates(data, text);

  const result = await structured({
    system:
      "You help interior designers record products they are specifying. Read one product page and return the details of the product, for the option currently selected on the page. Use only what the page shows. Never invent a price, a dimension, a SKU or a lead time: if the page does not show it, return null. Copy dimensions and lead times as written. The structured data block comes from the page's own markup and is exact: prefer it over the page text when they disagree about name, brand, SKU or price.",
    prompt: [
      `Page URL: ${input.url}`,
      `Structured data from the page markup:\n${JSON.stringify(data.product ?? {}, null, 1)}`,
      `Image candidates:\n${candidates.map((c) => `- ${c}`).join("\n") || "none"}`,
      `--- PAGE TEXT ---\n${text.slice(0, MAX_PAGE_CHARS)}`,
    ].join("\n\n"),
    schema: ClipSchema,
    maxTokens: 2000,
  });

  if (!result.is_product_page) throw new Error("That link doesn't look like a single product page. Open the product itself and paste that link.");

  // Only keep image URLs that really are on the page.
  const allowed = new Set(candidates);
  const images = result.images.filter((u) => allowed.has(u));
  return { ...result, images: images.length ? images : candidates.slice(0, 4) };
}

function imageCandidates(data: ProductData, text: string): string[] {
  const fromText = [...text.matchAll(MD_IMAGE)].map((m) => m[1]);
  const all = [...data.images, ...fromText].filter((u) => !/\.svg(\?|$)|sprite|icon|logo|favicon|placeholder|1x1|pixel/i.test(u));
  return [...new Set(all)].slice(0, 40);
}
