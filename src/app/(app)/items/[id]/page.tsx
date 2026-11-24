import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import type { Item, Project, Vendor } from "@/lib/types";
import { clientDescription, itemGaps, money, perUnit, priceItem, quantityLabel } from "@/lib/items";
import { ItemStatusTag, StatusTag } from "@/components/status-tag";
import { AutoRefresh } from "@/components/ui";
import { Facts, Sheet } from "@/components/sheet";
import { ItemPhoto } from "@/components/item-photo";
import { reclipItem } from "@/app/actions";
import { ItemForm } from "./item-form";
import { CopyText } from "./copy-text";
import { RemoveItem } from "./remove-item";

export const maxDuration = 300;

export async function generateMetadata(props: PageProps<"/items/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createUserClient();
  const { data } = await supabase.from("items").select("name").eq("id", id).maybeSingle();
  return { title: data?.name || "Item" };
}

export default async function ItemPage(props: PageProps<"/items/[id]">) {
  const { id } = await props.params;
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const [{ data: itemRow }, { data: vendorRows }, { data: projectRows }] = await Promise.all([
    supabase.from("items").select("*").eq("id", id).eq("team_id", ws.teamId).maybeSingle(),
    supabase.from("vendors").select("*").eq("team_id", ws.teamId).order("display_name"),
    supabase.from("projects").select("*").eq("team_id", ws.teamId).order("created_at", { ascending: false }),
  ]);
  if (!itemRow) notFound();
  const item = itemRow as Item;
  const vendors = (vendorRows ?? []) as Vendor[];
  const projects = (projectRows ?? []) as Project[];
  const seller = vendors.find((v) => v.id === item.vendor_id) ?? null;
  const project = projects.find((p) => p.id === item.project_id) ?? null;
  const price = priceItem(item);
  const gaps = itemGaps(item);
  const reading = item.status === "clipping";

  return (
    <div className="max-w-[720px]">
      <AutoRefresh active={reading} />
      <Link href="/items" className="text-sm text-muted hover:text-ink">
        All items
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="t-title min-w-0 [overflow-wrap:anywhere]">{item.name || (reading ? "Reading the page" : "Untitled item")}</h1>
          <ItemStatusTag status={item.status} />
        </div>
        <p className="mt-1 text-muted">
          {item.maker ? <span>{item.maker} · </span> : null}
          <a href={item.source_url} target="_blank" rel="noreferrer" className="hover:text-ink underline-offset-4 hover:underline">
            {item.source_domain}
          </a>
        </p>
        <p className="mt-4 text-[17px] leading-7">{nextStep(item, gaps)}</p>
      </header>

      {reading ? null : (
        <div className="mt-8 space-y-6">
          <Sheet title="Price">
            <Facts
              empty="No price yet. Add the retail or trade price under Edit."
              rows={[
                ["Retail", item.retail_price != null ? `${money(item.retail_price, item.currency)} ${perUnit(item.unit)}` : null],
                [
                  "Your cost",
                  price.costUnit != null
                    ? `${money(price.costUnit, item.currency)} ${perUnit(item.unit)}${price.costBasis === "discount off retail" ? ` (${item.discount_pct}% off retail)` : price.costBasis === "retail" ? " (retail, no discount on file)" : ""}`
                    : null,
                ],
                [
                  "Client price",
                  price.clientUnit != null
                    ? `${money(price.clientUnit, item.currency)} ${perUnit(item.unit)}${item.markup_pct ? ` (${item.markup_pct}% markup)` : ""}${
                        price.clientSavingPct != null && price.clientSavingPct > 0 ? `, ${price.clientSavingPct}% under retail` : ""
                      }`
                    : null,
                ],
                ["Freight", item.freight != null ? `${money(item.freight, item.currency)}, passed through at cost` : null],
                [
                  "Client total",
                  price.clientTotal != null ? `${money(price.clientTotal, item.currency)} for ${quantityLabel(item.quantity, item.unit)}` : null,
                ],
              ]}
            />
            {price.clientUnit != null && item.retail_price != null && price.clientUnit > item.retail_price ? (
              <p className="mt-4 rounded-[var(--radius-md)] bg-alert-wash text-alert px-4 py-3 text-sm">
                The client price is above the vendor&rsquo;s retail price. Check the trade price and markup.
              </p>
            ) : null}
            {item.price_note ? <p className="mt-4 text-sm text-muted">{item.price_note}</p> : null}

            <hr className="my-5 border-rule" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-muted">Buying from</span>
              {seller ? (
                <>
                  <Link href={`/vendors/${seller.id}`} className="link font-semibold">
                    {seller.display_name || seller.domain}
                  </Link>
                  <StatusTag status={seller.status} />
                </>
              ) : (
                <span>
                  {item.source_domain}, which isn&rsquo;t in your vendor list.{" "}
                  <Link href="/" className="link">
                    Add it
                  </Link>{" "}
                  to file a certificate and save your discount.
                </span>
              )}
            </div>
          </Sheet>

          <ItemForm
            item={item}
            projectName={project?.name ?? ""}
            projects={projects.map((p) => p.name)}
            vendors={vendors.map((v) => ({ id: v.id, name: v.display_name || v.domain }))}
            startEditing={item.status !== "ready"}
          />

          <Sheet title="Description for a proposal">
            <p className="text-sm text-muted max-w-prose mb-4">
              One block with the name and every spec, ready to paste into the client description in your proposal software.
            </p>
            <CopyText text={clientDescription(item)} />
          </Sheet>

          {item.images.length > 1 ? (
            <Sheet title="Photos from the page">
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {item.images.map((src) => (
                  <li key={src}>
                    <a href={src} target="_blank" rel="noreferrer" className="block">
                      <ItemPhoto src={src} className={`aspect-square w-full ${src === item.image_url ? "outline outline-2 outline-forest outline-offset-2" : ""}`} />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="hint !mt-4">The outlined photo is the one a client sees. Change it under Edit.</p>
            </Sheet>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            <form action={reclipItem.bind(null, item.id)}>
              <button className="hover:text-ink underline underline-offset-4">Read the page again</button>
            </form>
            <RemoveItem itemId={item.id} name={item.name || "this item"} />
          </div>
        </div>
      )}
    </div>
  );
}

function nextStep(item: Item, gaps: string[]): string {
  if (item.status === "clipping") return `Reading the product page on ${item.source_domain}. This usually takes under a minute.`;
  if (item.status === "failed") return `${item.clip_error ?? "The page couldn't be read."} You can fill in the details by hand below.`;
  if (gaps.length) return `Still needed: ${gaps.join(", ")}. The page didn't show ${gaps.length === 1 ? "it" : "them"}, so add ${gaps.length === 1 ? "it" : "them"} below.`;
  return "Everything on the page was read. Check it against the vendor's page before it goes on a proposal.";
}
