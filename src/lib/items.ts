import type { Item, ItemStatus } from "@/lib/types";

// The one place item rules live: how a price is worked out, what an item is
// still missing, and the description a designer pastes into other tools.

export const UNITS = ["each", "pair", "set", "yard", "square foot", "roll", "box"] as const;

export const ITEM_LIMITS = { text: 300, long: 4000, url: 2000 } as const;

type Priced = Pick<Item, "retail_price" | "trade_price" | "discount_pct" | "markup_pct" | "freight" | "quantity">;

export interface ItemPrice {
  /** What the firm pays for one. */
  costUnit: number | null;
  /** Where costUnit came from, so the screen can say so. */
  costBasis: "trade price" | "discount off retail" | "retail" | null;
  /** What the client pays for one. */
  clientUnit: number | null;
  costTotal: number | null;
  clientTotal: number | null;
  /** Client price for one, as a percent below retail. Null when there is no retail to compare. */
  clientSavingPct: number | null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Cost is the trade price when the designer has it. Otherwise it's retail less
 * the vendor's discount, and failing that, retail. The client pays cost plus
 * markup. Freight is added to both totals at cost and is never marked up.
 */
export function priceItem(i: Priced): ItemPrice {
  let costUnit: number | null = null;
  let costBasis: ItemPrice["costBasis"] = null;
  if (i.trade_price != null) {
    costUnit = i.trade_price;
    costBasis = "trade price";
  } else if (i.retail_price != null && i.discount_pct != null) {
    costUnit = round(i.retail_price * (1 - i.discount_pct / 100));
    costBasis = "discount off retail";
  } else if (i.retail_price != null) {
    costUnit = i.retail_price;
    costBasis = "retail";
  }
  const clientUnit = costUnit == null ? null : round(costUnit * (1 + (i.markup_pct ?? 0) / 100));
  const freight = i.freight ?? 0;
  const qty = i.quantity ?? 1;
  return {
    costUnit,
    costBasis,
    clientUnit,
    costTotal: costUnit == null ? null : round(costUnit * qty + freight),
    clientTotal: clientUnit == null ? null : round(clientUnit * qty + freight),
    clientSavingPct:
      clientUnit != null && i.retail_price ? Math.round((1 - clientUnit / i.retail_price) * 1000) / 10 : null,
  };
}

export function money(n: number | null, currency = "USD"): string {
  if (n == null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

const PLURAL: Record<string, string> = { "square foot": "square feet", box: "boxes" };

/** "each" or "per yard", for after a price. */
export function perUnit(unit: string): string {
  return unit === "each" ? "each" : `per ${unit}`;
}

/** "2", "1 pair", "12 yards": a quantity the way a designer would say it. */
export function quantityLabel(quantity: number, unit: string): string {
  if (unit === "each") return String(quantity);
  return `${quantity} ${quantity === 1 ? unit : PLURAL[unit] ?? `${unit}s`}`;
}

/** What a person still needs to add before the item is usable on a proposal. */
export function itemGaps(i: Pick<Item, "name" | "retail_price" | "trade_price" | "dimensions">): string[] {
  const gaps: string[] = [];
  if (!i.name.trim()) gaps.push("a name");
  if (i.retail_price == null && i.trade_price == null) gaps.push("a price");
  if (!i.dimensions?.trim()) gaps.push("dimensions");
  return gaps;
}

/** Ready needs a name and a price. Missing dimensions is worth a look but not a blocker. */
export function statusFor(i: Pick<Item, "name" | "retail_price" | "trade_price">): Extract<ItemStatus, "ready" | "needs_review"> {
  return i.name.trim() && (i.retail_price != null || i.trade_price != null) ? "ready" : "needs_review";
}

/**
 * The description a client reads: what it is, then the specs, one per line.
 * Written so it can be pasted into a proposal tool's description box as is.
 */
export function clientDescription(i: Pick<Item, "name" | "maker" | "description" | "dimensions" | "material" | "finish" | "color" | "lead_time">): string {
  const title = [i.maker.trim(), i.name.trim()].filter(Boolean).join(" ");
  const specs: [string, string | null][] = [
    ["Dimensions", i.dimensions],
    ["Material", i.material],
    ["Finish", i.finish],
    ["Color", i.color],
    ["Lead time", i.lead_time],
  ];
  return [title, i.description?.trim(), ...specs.filter(([, v]) => v?.trim()).map(([k, v]) => `${k}: ${v!.trim()}`)]
    .filter(Boolean)
    .join("\n");
}
