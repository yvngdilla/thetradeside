import type { Item, ItemStatus, Vendor } from "@/lib/types";

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

type Seller = Pick<Vendor, "id" | "domain" | "aliases" | "display_name" | "trade_discount_pct">;

export interface BuyingRoute<V extends Seller> {
  /** Who the firm buys it from. Null when that vendor isn't in the list yet. */
  seller: V | null;
  /** The vendor whose own site the item was clipped from, when it's in the list. */
  maker: V | null;
  /** Direct from the maker's site, through someone else (a buying group, a showroom), or not set. */
  how: "direct" | "through" | "unlisted";
  /**
   * The other way to buy the same item, priced at retail less that vendor's
   * discount. `saving` is what the firm keeps per unit by buying the way it
   * does now: negative means the other way is cheaper.
   */
  other: { vendor: V; costUnit: number; saving: number } | null;
  /** Another way to buy exists, but its discount isn't on file, so there's nothing to compare. */
  needsTerms: V | null;
}

/**
 * Whether an item is bought direct or through another seller, and which is
 * cheaper when both sets of terms are known. `alsoSoldBy` is the vendor ids the
 * firm has bought this maker's other items from, which is how a buying group
 * shows up as an option on an item currently bought direct.
 */
export function buyingRoute<V extends Seller>(
  item: Pick<Item, "vendor_id" | "source_domain"> & Priced,
  vendors: V[],
  alsoSoldBy: (string | null)[] = [],
): BuyingRoute<V> {
  const seller = vendors.find((v) => v.id === item.vendor_id) ?? null;
  const maker = vendors.find((v) => v.domain === item.source_domain || v.aliases.includes(item.source_domain)) ?? null;
  const how = !seller ? "unlisted" : seller.id === maker?.id ? "direct" : "through";

  const others = vendors.filter((v) => v.id !== seller?.id && (v.id === maker?.id || alsoSoldBy.includes(v.id)));
  const current = priceItem(item).costUnit;
  let other: BuyingRoute<V>["other"] = null;
  if (seller && current != null && item.retail_price != null) {
    for (const vendor of others) {
      if (vendor.trade_discount_pct == null) continue;
      const costUnit = round(item.retail_price * (1 - vendor.trade_discount_pct / 100));
      if (!other || costUnit < other.costUnit) other = { vendor, costUnit, saving: round(costUnit - current) };
    }
  }
  return { seller, maker, how, other, needsTerms: seller && !other ? others[0] ?? null : null };
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

type Described = Pick<Item, "name" | "maker" | "description" | "dimensions" | "material" | "finish" | "color" | "lead_time">;

/** "Fernhill Wren Table Lamp": maker then name, the way a line on a list starts. */
export function itemTitle(i: Pick<Item, "name" | "maker">): string {
  return [i.maker.trim(), i.name.trim()].filter(Boolean).join(" ");
}

/** The specs worth showing beside an item, in a fixed order, skipping the empty ones. */
export function itemSpecs(i: Omit<Described, "name" | "maker" | "description">): [string, string][] {
  const specs: [string, string | null][] = [
    ["Dimensions", i.dimensions],
    ["Material", i.material],
    ["Finish", i.finish],
    ["Color", i.color],
    ["Lead time", i.lead_time],
  ];
  return specs.filter(([, v]) => v?.trim()).map(([k, v]) => [k, v!.trim()]);
}

/**
 * The description a client reads: what it is, then the specs, one per line.
 * Written so it can be pasted into a proposal tool's description box as is.
 */
export function clientDescription(i: Described): string {
  return [itemTitle(i), i.description?.trim(), ...itemSpecs(i).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join("\n");
}

/** Items still being read, or that couldn't be read, are left off every list that leaves the firm. */
export function listable(i: Pick<Item, "status">): boolean {
  return i.status === "ready" || i.status === "needs_review";
}

export interface RoomGroup<I> {
  /** The room as typed on the item. Empty for items with no room yet. */
  room: string;
  items: I[];
}

/**
 * A project's items by room. Rooms come in the order the designer dragged them
 * into (`order`), then any room not placed yet in the order it was first used,
 * with items that have no room last. Within a room, oldest first.
 */
export function byRoom<I extends Pick<Item, "room" | "created_at">>(items: I[], order: string[] = []): RoomGroup<I>[] {
  const sorted = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groups = new Map<string, I[]>();
  for (const i of sorted) {
    const room = i.room?.trim() ?? "";
    groups.set(room, [...(groups.get(room) ?? []), i]);
  }
  const rank = (room: string) => {
    const at = order.indexOf(room);
    return at >= 0 ? at : room ? order.length : order.length + 1;
  };
  return [...groups.entries()].map(([room, list]) => ({ room, items: list })).sort((a, b) => rank(a.room) - rank(b.room));
}

/** Money added up per currency, so a list never adds dollars to euros. "$1,200.00" or "$1,200.00 + €300.00". */
export function sumMoney(amounts: { amount: number | null; currency: string }[]): string {
  const totals = new Map<string, number>();
  for (const { amount, currency } of amounts) if (amount != null) totals.set(currency, round((totals.get(currency) ?? 0) + amount));
  return [...totals.entries()].map(([currency, n]) => money(n, currency)).join(" + ");
}
