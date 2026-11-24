import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import type { Item, Project } from "@/lib/types";
import { byRoom, itemSpecs, itemTitle, listable, money, perUnit, priceItem, quantityLabel, sumMoney } from "@/lib/items";
import { Doodle } from "@/components/doodle";
import { ItemPhoto } from "@/components/item-photo";
import { PrintButton } from "./print-button";
import { RoomSections } from "./room-sections";

// The lists a project's items are handed over as. The client list shows each
// piece with its photo, description and the client's price. The contractor list
// is the same pieces with no prices at all: none are sent to the browser.
const VIEWS = {
  client: { label: "Client list", about: "What your client sees: each piece with its photo, description and price, room by room." },
  contractor: { label: "Contractor list", about: "The same pieces with no prices, for whoever is receiving and installing them." },
} as const;
type View = keyof typeof VIEWS;

async function load(id: string) {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).eq("team_id", ws.teamId).maybeSingle();
  return { ws, supabase, project: data as Project | null };
}

export async function generateMetadata(props: PageProps<"/items/project/[id]">): Promise<Metadata> {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const { project } = await load(id);
  const view: View = query.view === "contractor" ? "contractor" : "client";
  // Also the file name a browser suggests when the list is saved as a PDF.
  return { title: project ? `${project.name}: ${VIEWS[view].label.toLowerCase()}` : "Project" };
}

export default async function ProjectListPage(props: PageProps<"/items/project/[id]">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const { ws, supabase, project } = await load(id);
  if (!project) notFound();
  const view: View = query.view === "contractor" ? "contractor" : "client";
  const withPrices = view === "client";

  const { data: itemRows } = await supabase.from("items").select("*").eq("team_id", ws.teamId).eq("project_id", id);
  const all = (itemRows ?? []) as Item[];
  const items = all.filter(listable);
  const leftOff = all.length - items.length;
  const rooms = byRoom(items, project.room_order ?? []);
  const unpriced = items.filter((i) => priceItem(i).clientTotal == null).length;
  const total = sumMoney(items.map((i) => ({ amount: priceItem(i).clientTotal, currency: i.currency })));
  const today = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date());

  return (
    <div>
      <Doodle name="swatches" className="hidden xl:block absolute -right-36 top-6 h-32 w-32 print:!hidden" />
      <Link href="/items" className="text-sm text-muted hover:text-ink print:hidden">
        All items
      </Link>

      <header className="mt-4 print:mt-0">
        <p className="hidden print:block text-sm text-muted">
          {ws.teamName} · {VIEWS[view].label} · {today}
        </p>
        <h1 className="t-title [overflow-wrap:anywhere]">{project.name}</h1>
        <p className="mt-2 text-muted max-w-prose print:hidden">{VIEWS[view].about}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 print:hidden">
        <nav aria-label="Which list" className="flex gap-1 rounded-full bg-wash p-1 text-sm">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <Link
              key={v}
              href={v === "client" ? `/items/project/${id}` : `/items/project/${id}?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={`rounded-full px-4 py-2 whitespace-nowrap ${v === view ? "bg-sheet text-ink font-semibold" : "text-muted hover:text-ink"}`}
            >
              {VIEWS[v].label}
            </Link>
          ))}
        </nav>
        {items.length ? (
          <div className="flex flex-wrap gap-3 sm:ml-auto">
            <a href={`/api/projects/${id}/csv`} className="btn btn-quiet">
              Download spreadsheet
            </a>
            <PrintButton />
          </div>
        ) : null}
      </div>

      {leftOff ? (
        <p className="mt-6 text-sm text-muted print:hidden">
          {leftOff === 1 ? "1 item is" : `${leftOff} items are`} left off because the page is still being read or couldn&rsquo;t be read.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-md)] border border-dashed border-control px-6 py-12 text-center">
          <p className="t-name">Nothing to list yet</p>
          <p className="mt-2 text-muted max-w-md mx-auto">Items you add to this project show up here, grouped by the room you give them.</p>
        </div>
      ) : (
        <div className="mt-6">
          <RoomSections
            // Remounts only when the set of rooms changes, not when their order does.
            key={rooms.map((r) => r.room).sort().join("\n")}
            projectId={id}
            rooms={rooms.map((r) => ({
              room: r.room,
              label: r.room || "No room yet",
              count: r.items.length,
              content: (
                <>
                  <ul className="divide-y divide-rule">
                    {r.items.map((i) => (
                      <ListedItem key={i.id} item={i} withPrices={withPrices} />
                    ))}
                  </ul>
                  {withPrices && rooms.length > 1 ? (
                    <p className="border-t border-rule pt-3 text-right text-sm tabular-nums">
                      <span className="text-muted">{r.room || "No room yet"}</span>{" "}
                      <span className="ml-3 font-semibold">{sumMoney(r.items.map((i) => ({ amount: priceItem(i).clientTotal, currency: i.currency }))) || "Not priced yet"}</span>
                    </p>
                  ) : null}
                </>
              ),
            }))}
          />

          {withPrices ? (
            <footer className="mt-10 border-t-2 border-ink pt-4 break-inside-avoid">
              <p className="flex items-baseline justify-between gap-6">
                <span className="t-name">Total</span>
                <span className="text-lg font-semibold tabular-nums">{total || "Not priced yet"}</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {unpriced ? `${unpriced === 1 ? "1 piece is" : `${unpriced} pieces are`} not priced yet and not in the total. ` : ""}
                Freight is included where it is known. Sales tax is not included.
              </p>
            </footer>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** One piece on a list: its photo, then what it is, then how many (and, for the client, what it costs). */
function ListedItem({ item, withPrices }: { item: Item; withPrices: boolean }) {
  const specs = withPrices ? itemSpecs(item) : ([...(item.sku ? [["SKU", item.sku]] : []), ...itemSpecs(item)] as [string, string][]);
  const price = withPrices ? priceItem(item) : null;
  return (
    <li className="grid grid-cols-[5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)_10rem] print:grid-cols-[8rem_minmax(0,1fr)_10rem] gap-x-5 gap-y-3 py-5 break-inside-avoid">
      <ItemPhoto src={item.image_url} loading="eager" className="h-20 w-20 sm:h-32 sm:w-32 print:h-32 print:w-32" />
      <div className="min-w-0">
        <p className="font-semibold [overflow-wrap:anywhere]">
          <Link href={`/items/${item.id}`} className="hover:text-accent">
            {itemTitle(item) || "Untitled item"}
          </Link>
        </p>
        {item.description ? <p className="mt-1 text-[15px] leading-6 whitespace-pre-line">{item.description.trim()}</p> : null}
        {specs.length ? (
          <dl className="mt-2 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="text-muted shrink-0">{k}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {!withPrices ? (
          <p className="mt-2 text-sm">
            <a href={item.source_url} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-4 hover:text-ink [overflow-wrap:anywhere]">
              {item.source_domain}
            </a>
          </p>
        ) : null}
      </div>
      <div className="col-start-2 sm:col-start-3 print:col-start-3 sm:text-right print:text-right text-sm tabular-nums">
        {price ? (
          price.clientTotal == null ? (
            <>
              <p className="text-muted">Quantity {quantityLabel(item.quantity, item.unit)}</p>
              <p className="mt-1">Price to come</p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold">{money(price.clientTotal, item.currency)}</p>
              <p className="mt-1 text-muted">
                {quantityLabel(item.quantity, item.unit)} at {money(price.clientUnit, item.currency)} {perUnit(item.unit)}
              </p>
              {item.freight ? <p className="text-muted">plus {money(item.freight, item.currency)} freight</p> : null}
            </>
          )
        ) : (
          <p>
            <span className="text-muted">Quantity</span> <span className="text-[15px] font-semibold">{quantityLabel(item.quantity, item.unit)}</span>
          </p>
        )}
      </div>
    </li>
  );
}
