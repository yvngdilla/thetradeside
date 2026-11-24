import type { Item, Vendor } from "@/lib/types";
import { byRoom, itemSpecs, listable, priceItem } from "@/lib/items";

// A project's items as a spreadsheet. The first eleven columns use the headers
// Studio Designer's product importer asks for, so they map without retyping;
// the rest carry what Trade Side knows beyond that (room, quantity, the firm's
// numbers). Studio Designer lets a designer skip columns it doesn't want.

const HEADERS = [
  "product code", "name", "tags", "manufacturer", "price type", "price", "description", "product url", "image", "vendor", "currency",
  "room", "quantity", "unit", "dimensions", "material", "finish", "color", "lead time",
  "retail price", "unit cost", "markup percent", "client unit price", "freight", "client total",
] as const;

/** Quotes a cell, and stops a spreadsheet from running text that starts like a formula. */
function cell(value: string | number | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

type Seller = Pick<Vendor, "id" | "domain" | "display_name">;

export function itemsCsv(items: Item[], vendors: Seller[], roomOrder: string[] = []): string {
  const rows = byRoom(items.filter(listable), roomOrder).flatMap((group) =>
    group.items.map((i) => {
      const price = priceItem(i);
      const seller = vendors.find((v) => v.id === i.vendor_id);
      // The importer takes one price and whether it is retail or trade: give it what the firm pays when that's known.
      const trade = price.costBasis === "trade price" || price.costBasis === "discount off retail";
      return [
        i.sku?.slice(0, 30),
        i.name,
        group.room,
        i.maker,
        price.costUnit == null ? "" : trade ? "trade" : "retail",
        price.costUnit,
        [i.description?.trim(), ...itemSpecs(i).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join("\n"),
        i.source_url,
        i.image_url,
        seller ? seller.display_name || seller.domain : i.source_domain,
        i.currency,
        group.room,
        i.quantity,
        i.unit,
        i.dimensions,
        i.material,
        i.finish,
        i.color,
        i.lead_time,
        i.retail_price,
        price.costUnit,
        i.markup_pct,
        price.clientUnit,
        i.freight,
        price.clientTotal,
      ];
    }),
  );
  // Excel reads accents and inch marks correctly only with the byte order mark and CRLF line ends.
  return "﻿" + [HEADERS as readonly (string | number)[], ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
