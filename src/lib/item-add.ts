import "server-only";
import { createUserClient } from "@/lib/supabase/server";
import { normalizeDomain } from "@/lib/domain";
import { ITEM_LIMITS } from "@/lib/items";
import type { WorkspaceContext } from "@/lib/workspace";

// The one way an item gets created from a link, whether the link was pasted
// into the app or sent by the browser extension.

/** Finds the project by name in this workspace, or creates it. Blank means no project. */
export async function projectIdFor(teamId: string, userId: string, name: string): Promise<string | null> {
  const clean = name.trim().slice(0, 200);
  if (!clean) return null;
  const supabase = await createUserClient();
  const { data: existing } = await supabase.from("projects").select("id").eq("team_id", teamId).ilike("name", clean.replace(/[%_]/g, "")).maybeSingle();
  if (existing) return existing.id as string;
  const { data: created } = await supabase.from("projects").insert({ team_id: teamId, name: clean, created_by: userId }).select("id").single();
  return (created?.id as string) ?? null;
}

/** The vendor in this workspace that owns a domain (or lists it as an alias). */
async function vendorForDomain(teamId: string, domain: string) {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, trade_discount_pct, markup_pct")
    .eq("team_id", teamId)
    .or(`domain.eq.${domain},aliases.cs.{${domain}}`)
    .maybeSingle();
  return data as { id: string; trade_discount_pct: number | null; markup_pct: number | null } | null;
}

export interface NewItem {
  /** The product page. */
  url: string;
  project?: string;
  /** Kept on the item for the team, e.g. where it was found. */
  notes?: string;
  /**
   * Details already known, for a link that has no product page to read (a pin
   * with no source). The item is saved as it is and waits for a person.
   */
  known?: { name: string; image: string | null };
}

/**
 * Adds one item to the workspace, with the terms of the vendor whose site it
 * is on. Unless `known` is given the item starts as "clipping": the caller
 * starts the page read.
 */
export async function createItem(ws: WorkspaceContext, input: NewItem): Promise<{ id: string; domain: string } | { error: string }> {
  const raw = input.url.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { error: "Paste the link to the product page." };
  }
  const domain = normalizeDomain(url.href);
  if (!domain || raw.length > ITEM_LIMITS.url) return { error: "Paste the link to the product page." };
  if (url.pathname === "/" && !url.search) return { error: "That's the vendor's home page. Open the product itself and paste that link." };

  const [projectId, vendor] = await Promise.all([projectIdFor(ws.teamId, ws.userId, input.project ?? ""), vendorForDomain(ws.teamId, domain)]);

  const supabase = await createUserClient();
  const { data: item, error } = await supabase
    .from("items")
    .insert({
      team_id: ws.teamId,
      project_id: projectId,
      vendor_id: vendor?.id ?? null,
      source_url: url.href,
      source_domain: domain,
      discount_pct: vendor?.trade_discount_pct ?? null,
      markup_pct: vendor?.markup_pct ?? null,
      notes: input.notes?.slice(0, ITEM_LIMITS.long) || null,
      created_by: ws.userId,
      ...(input.known
        ? {
            status: "needs_review",
            name: input.known.name.slice(0, ITEM_LIMITS.text),
            images: input.known.image ? [input.known.image] : [],
            image_url: input.known.image,
          }
        : {}),
    })
    .select("id")
    .single();
  if (error || !item) return { error: "Couldn't add that item. Try again." };
  return { id: item.id as string, domain };
}
