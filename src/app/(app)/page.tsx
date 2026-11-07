import type { Metadata } from "next";
import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace, loadProfileAndSigner } from "@/lib/workspace";
import { detailGaps, signerGaps, type Vendor } from "@/lib/types";
import { StatusTag, METHOD_LABELS } from "@/components/status-tag";
import { AutoRefresh } from "@/components/ui";
import { AddVendorForm } from "./add-vendor-form";

export const metadata: Metadata = { title: "Vendors" };
export const maxDuration = 300;

const FILTERS = {
  all: { label: "All", match: () => true },
  todo: { label: "Needs you", match: (v: Vendor) => ["ready", "needs_review", "in_progress", "failed"].includes(v.status) },
  filed: { label: "Filed", match: (v: Vendor) => v.status === "filed" },
} as const;
type FilterKey = keyof typeof FILTERS;

export default async function VendorsPage(props: PageProps<"/">) {
  const ws = await getWorkspace();
  const sp = await props.searchParams;
  const filter: FilterKey = (sp.show as FilterKey) in FILTERS ? (sp.show as FilterKey) : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const supabase = await createUserClient();
  const [{ data }, { profile, signer }] = await Promise.all([
    supabase.from("vendors").select("*").eq("team_id", ws.teamId).order("updated_at", { ascending: false }),
    loadProfileAndSigner(ws),
  ]);
  const vendors = (data ?? []) as Vendor[];
  const setup = [
    { title: "Certificate details", missing: detailGaps(profile), href: "/settings#business", action: "Add details", note: "Shared by your workspace" },
    { title: "Your signature", missing: signerGaps(signer), href: "/settings#signature", action: "Add signature", note: "Each person signs for themselves" },
  ];
  const setupDone = setup.every((step) => step.missing.length === 0);
  const counts = {
    all: vendors.length,
    todo: vendors.filter(FILTERS.todo.match).length,
    filed: vendors.filter(FILTERS.filed.match).length,
  };
  const shown = vendors
    .filter(FILTERS[filter].match)
    .filter((v) => !q || [v.display_name, v.seller_name, v.domain, ...v.aliases].some((s) => s?.toLowerCase().includes(q)));

  return (
    <div>
      <AutoRefresh active={vendors.some((v) => v.status === "researching")} />

      <header>
        <h1 className="t-title">Vendors</h1>
        <p className="mt-2 text-muted max-w-prose">
          Add a vendor by its website. If you&rsquo;ve already filed with them, you&rsquo;ll see it right away.
        </p>
      </header>

      {setupDone ? null : (
        <section aria-labelledby="setup-title" className="mt-8 rounded-md border border-rule bg-sheet">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            <span aria-hidden className="h-2 w-2 rounded-full bg-alert" />
            <h2 id="setup-title" className="font-semibold">
              Finish setting up before you file
            </h2>
          </div>
          <ul className="divide-y divide-rule border-t border-rule">
            {setup.map((step) => (
              <li key={step.title} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <div className="min-w-0 grow basis-60">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-sm text-muted">
                    {step.missing.length === 0
                      ? `${step.note}.`
                      : step.missing.length <= 3
                      ? `Still needed: ${listOf(step.missing)}. ${step.note}.`
                      : `${step.missing.length} items to add. ${step.note}.`}
                  </p>
                </div>
                {step.missing.length ? (
                  <Link href={step.href} className="btn btn-quiet !py-2">
                    {step.action}
                  </Link>
                ) : (
                  <span className="text-sm text-forest font-semibold">Done</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AddVendorForm />

      <section aria-label="Your vendors" className="mt-12">
        {vendors.length === 0 ? (
          <div className="rounded-md border border-dashed border-control px-6 py-12 text-center">
            <p className="t-name">No vendors yet</p>
            <p className="mt-2 text-muted max-w-md mx-auto">
              Paste the website of a showroom or brand you buy from, like <span className="text-ink">visualcomfort.com</span>. Trade Side
              finds how they take resale certificates and keeps track once you&rsquo;ve filed.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 border-b border-rule">
              <nav className="flex gap-6 text-sm" aria-label="Filter vendors">
                {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
                  <Link
                    key={key}
                    href={key === "all" ? "/" : `/?show=${key}`}
                    aria-current={filter === key ? "page" : undefined}
                    className={`pb-3 -mb-px border-b-2 ${filter === key ? "border-forest text-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}
                  >
                    {FILTERS[key].label} <span className="ml-0.5 text-muted font-normal tabular-nums">{counts[key]}</span>
                  </Link>
                ))}
              </nav>
              <form className="w-full sm:w-64 sm:pb-2.5" role="search">
                {filter !== "all" ? <input type="hidden" name="show" value={filter} /> : null}
                <label htmlFor="q" className="sr-only">
                  Search vendors
                </label>
                <input id="q" name="q" type="search" defaultValue={q} placeholder="Search vendors" className="field !py-1.5 text-sm" />
              </form>
            </div>

            {shown.length === 0 ? (
              <p className="py-12 text-muted">{q ? `No vendors match “${q}”.` : "Nothing here yet."}</p>
            ) : (
              <ul className="divide-y divide-rule">
                {shown.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/vendors/${v.id}`}
                      className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_9rem_9rem_7rem] items-center gap-x-6 gap-y-1 py-4 group"
                    >
                      <div className="min-w-0">
                        <p className="t-name truncate group-hover:text-forest">{v.display_name || v.domain}</p>
                        <p className="text-sm text-muted truncate">{v.domain}</p>
                      </div>
                      <div className="justify-self-end sm:justify-self-start">
                        <StatusTag status={v.status} />
                      </div>
                      <p className="hidden sm:block text-sm text-muted">{v.status === "researching" ? "" : METHOD_LABELS[v.method]}</p>
                      <p className="hidden sm:block text-sm text-muted text-right tabular-nums">
                        {v.filed_at ? new Date(v.filed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function listOf(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
