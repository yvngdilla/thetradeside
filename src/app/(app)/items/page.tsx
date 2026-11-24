import { Doodle } from "@/components/doodle";
import { HandArrow, HandNote, PaperShape } from "@/components/paper-shape";
import type { Metadata } from "next";
import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import type { Item, Project, Vendor } from "@/lib/types";
import { buyingRoute, money, priceItem } from "@/lib/items";
import { ItemStatusTag } from "@/components/status-tag";
import { AutoRefresh } from "@/components/ui";
import { ItemPhoto } from "@/components/item-photo";
import { AddItemForm } from "./add-item-form";

export const metadata: Metadata = { title: "Items" };
export const maxDuration = 300;

export default async function ItemsPage() {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const [{ data: itemRows }, { data: projectRows }, { data: vendorRows }] = await Promise.all([
    supabase.from("items").select("*").eq("team_id", ws.teamId).order("created_at", { ascending: false }),
    supabase.from("projects").select("*").eq("team_id", ws.teamId).order("created_at", { ascending: false }),
    supabase.from("vendors").select("id, domain, aliases, display_name, trade_discount_pct").eq("team_id", ws.teamId),
  ]);
  const vendors = (vendorRows ?? []) as Pick<Vendor, "id" | "domain" | "aliases" | "display_name" | "trade_discount_pct">[];
  const items = (itemRows ?? []) as Item[];
  const projects = (projectRows ?? []) as Project[];

  // Newest project first, then anything not yet in a project.
  const groups = [
    ...projects.map((p) => ({ key: p.id, name: p.name, items: items.filter((i) => i.project_id === p.id) })),
    { key: "none", name: "No project yet", items: items.filter((i) => !i.project_id || !projects.some((p) => p.id === i.project_id)) },
  ].filter((g) => g.items.length);

  return (
    <div>
      <AutoRefresh active={items.some((i) => i.status === "clipping")} />

      <Doodle name="tag" className="hidden xl:block absolute -right-36 top-6 h-32 w-32" />
      <header>
        <h1 className="t-title">Items</h1>
        <p className="mt-2 text-muted max-w-prose">
          Paste the link to a product page. Trade Side reads the name, maker, dimensions, materials, photos and price, and applies your
          terms with that vendor.
        </p>
      </header>

      <div className="relative mt-10">
        <PaperShape tone="sky" cut={2} className="-inset-x-[3%] -inset-y-[20%]" />
        <HandNote className="-left-44 top-5 -rotate-6">
          paste, don&rsquo;t type
          <HandArrow className="ml-14 mt-0.5" />
        </HandNote>
        <AddItemForm projects={projects.map((p) => p.name)} />
      </div>

      <section aria-label="Your items" className="mt-12 space-y-12">
        {items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-control px-6 py-12 text-center">
            <p className="t-name">No items yet</p>
            <p className="mt-2 text-muted max-w-md mx-auto">
              Find a piece on a vendor&rsquo;s site, copy the link from the address bar and paste it above. Each item is entered once and
              kept with its vendor, price and specs.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule pb-3">
                <h2 className="t-name">
                  {g.name} <span className="font-sans text-sm text-muted tabular-nums">{g.items.length}</span>
                </h2>
                {g.key !== "none" ? (
                  <Link href={`/items/project/${g.key}`} className="ml-auto text-sm font-semibold underline underline-offset-4 hover:text-accent">
                    Client and contractor lists
                  </Link>
                ) : null}
              </div>
              <ul className="divide-y divide-rule">
                {g.items.map((i) => {
                  const price = priceItem(i);
                  const route = buyingRoute(i, vendors);
                  const from = route.how === "through" ? `through ${route.seller!.display_name || route.seller!.domain}` : i.source_domain;
                  return (
                    <li key={i.id}>
                      <Link href={`/items/${i.id}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_8rem] items-center gap-x-4 sm:gap-x-6 py-4 group">
                        <ItemPhoto src={i.image_url} className="h-14 w-14" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate group-hover:text-accent">{i.name || (i.status === "clipping" ? "Reading the page" : "Untitled item")}</p>
                          <p className="text-sm text-muted truncate">{[i.maker, i.room, from].filter(Boolean).join(" · ")}</p>
                        </div>
                        <p className="hidden sm:block text-sm text-right tabular-nums">{money(price.clientTotal, i.currency)}</p>
                        <div className="justify-self-end">
                          <ItemStatusTag status={i.status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
