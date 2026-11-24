import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { clipItem, type ClipResult } from "@/lib/clip";
import { statusFor } from "@/lib/items";
import { isDemo } from "@/lib/demo/store";
import { has } from "@/lib/env";

/**
 * Demo mode reads the real page when both lookup keys are set, so page reading
 * can be tried on real links without a database. Without them it stands in.
 */
function standIn(): boolean {
  return isDemo() && !(has("ANTHROPIC_API_KEY") && has("FIRECRAWL_API_KEY"));
}

/** Demo mode without keys: a stand-in read, clearly labelled, so no paid lookup runs. */
async function demoClip(url: string): Promise<ClipResult> {
  await new Promise((r) => setTimeout(r, 3000));
  const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "item";
  const name = slug.replace(/\.[a-z]+$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    is_product_page: true,
    name,
    maker: "",
    sku: null,
    description: "Demo mode: no real page was read. In the live app the details below come from the product page.",
    dimensions: null,
    material: null,
    finish: null,
    color: null,
    lead_time: null,
    retail_price: null,
    trade_price: null,
    currency: "USD",
    unit: "each",
    price_note: null,
    images: [],
  };
}

/** Reads the product page behind an item and stores what it finds. Safe to call from after(). */
export async function runClipJob(itemId: string) {
  const admin = createAdminClient();
  const { data: item } = await admin.from("items").select("id, source_url").eq("id", itemId).single();
  if (!item) return;

  try {
    const r = standIn() ? await demoClip(item.source_url) : await clipItem({ url: item.source_url });
    await admin
      .from("items")
      .update({
        name: r.name,
        maker: r.maker,
        sku: r.sku,
        description: r.description,
        dimensions: r.dimensions,
        material: r.material,
        finish: r.finish,
        color: r.color,
        lead_time: r.lead_time,
        retail_price: r.retail_price,
        trade_price: r.trade_price,
        currency: r.currency || "USD",
        unit: r.unit,
        price_note: r.price_note,
        images: r.images,
        image_url: r.images[0] ?? null,
        clip_error: null,
        status: statusFor({ name: r.name, retail_price: r.retail_price, trade_price: r.trade_price }),
      })
      .eq("id", itemId)
      // Only fill in an item that is still waiting, so a person's edits are never overwritten.
      .eq("status", "clipping");
  } catch (err) {
    await admin
      .from("items")
      .update({ status: "failed", clip_error: err instanceof Error ? err.message : String(err) })
      .eq("id", itemId)
      .eq("status", "clipping");
  }
}
