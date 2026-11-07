import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { researchVendor, suggestDescription } from "@/lib/research";
import { nameKey } from "@/lib/domain";
import { isDemo } from "@/lib/demo/store";
import type { ResearchResult } from "@/lib/research";

/** Demo mode: a stand-in lookup, clearly labelled, so no paid crawl runs. */
async function demoResearch(domain: string): Promise<ResearchResult> {
  await new Promise((r) => setTimeout(r, 4000));
  const brand = domain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    display_name: brand,
    seller_name: brand,
    method: "email",
    trade_email: null,
    trade_url: null,
    application_url: null,
    own_form_url: null,
    required_documents: ["California resale certificate"],
    product_categories: "furniture and home accessories",
    discount_info: null,
    summary: `Demo mode: no real lookup ran for ${domain}. In the live app this is where we say how they take certificates. Add their trade email below to try filing.`,
    confidence: "low",
    sources: [],
  };
}

/** Runs vendor research and stores the result. Safe to call from after(). */
export async function runResearchJob(vendorId: string) {
  const admin = createAdminClient();
  const { data: vendor } = await admin.from("vendors").select("id, team_id, domain").eq("id", vendorId).single();
  if (!vendor) return;

  await admin.from("vendors").update({ status: "researching", research_error: null }).eq("id", vendorId);

  try {
    const r = isDemo() ? await demoResearch(vendor.domain) : await researchVendor(vendor.domain);

    const { data: profile } = await admin
      .from("business_profiles")
      .select("property_description")
      .eq("team_id", vendor.team_id)
      .maybeSingle();

    // Flag a likely duplicate: same company under another domain (e.g. rh.com and restorationhardware.com).
    const { data: others } = await admin
      .from("vendors")
      .select("id, display_name, seller_name, domain")
      .eq("team_id", vendor.team_id)
      .neq("id", vendorId);
    const key = nameKey(r.seller_name || r.display_name);
    const dup = key ? others?.find((o) => nameKey(o.seller_name || o.display_name) === key) : undefined;

    const needsReview = r.confidence === "low" || r.method === "unknown" || (r.method === "email" && !r.trade_email);

    await admin
      .from("vendors")
      .update({
        display_name: r.display_name,
        seller_name: r.seller_name,
        method: r.method,
        trade_email: r.trade_email,
        trade_url: r.trade_url,
        application_url: r.application_url,
        own_form_url: r.own_form_url,
        required_documents: r.required_documents,
        discount_info: r.discount_info,
        property_description: suggestDescription(r.product_categories, profile?.property_description ?? ""),
        research_summary: r.summary,
        research_confidence: r.confidence,
        research_sources: r.sources,
        notes: dup ? `This may be the same company as ${dup.display_name || dup.domain} (${dup.domain}), which is already in your list.` : null,
        status: needsReview ? "needs_review" : "ready",
      })
      .eq("id", vendorId)
      .eq("status", "researching");
  } catch (err) {
    await admin
      .from("vendors")
      .update({ status: "failed", research_error: err instanceof Error ? err.message : String(err) })
      .eq("id", vendorId);
  }
}
