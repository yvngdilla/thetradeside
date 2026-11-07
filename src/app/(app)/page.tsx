import type { Metadata } from "next";
import Link from "next/link";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace, loadProfileAndSigner } from "@/lib/workspace";
import { profileGaps, type Vendor } from "@/lib/types";
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
  const gaps = profileGaps(profile, signer);
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

      <section className="max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">Vendors</h1>
        <p className="text-muted mt-2">
          Add a vendor by its website. If you&rsquo;ve already filed with them, you&rsquo;ll see it right away.
        </p>
        <AddVendorForm />
      </section>

      {gaps.length > 0 ? (
        <div className="mt-6 max-w-2xl border-l-2 border-oxblood bg-oxblood-wash/60 px-4 py-3 text-sm">
          Before you can file, finish your certificate details: {gaps.join(", ")}.{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-4">
            Go to Settings
          </Link>
        </div>
      ) : null}

      <section className="mt-12">
        <div className="flex flex-wrap items-end gap-4 border-b border-rule">
          <nav className="flex gap-5 text-sm" aria-label="Filter vendors">
            {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
              <Link
                key={key}
                href={key === "all" ? "/" : `/?show=${key}`}
                aria-current={filter === key ? "page" : undefined}
                className={`pb-3 -mb-px border-b-2 ${filter === key ? "border-chip text-ink font-semibold" : "border-transparent text-muted hover:text-ink"}`}
              >
                {FILTERS[key].label} <span className="text-muted font-normal">{counts[key]}</span>
              </Link>
            ))}
          </nav>
          <form className="ml-auto pb-2" role="search">
            {filter !== "all" ? <input type="hidden" name="show" value={filter} /> : null}
            <label htmlFor="q" className="sr-only">
              Search vendors
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Search vendors" className="field !py-1.5 w-56" />
          </form>
        </div>

        {vendors.length === 0 ? (
          <p className="py-16 text-muted max-w-md">
            No vendors yet. Paste the website of a showroom or brand you buy from, like <span className="text-ink">visualcomfort.com</span>, to
            get started.
          </p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-muted">No vendors match.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {shown.map((v) => (
              <li key={v.id}>
                <Link href={`/vendors/${v.id}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,2fr)_10rem_9rem_8rem] items-center gap-x-6 gap-y-1 py-4 group">
                  <div className="min-w-0">
                    <p className="font-display text-xl truncate group-hover:text-chip">{v.display_name || v.domain}</p>
                    <p className="text-sm text-muted truncate">{v.domain}</p>
                  </div>
                  <div className="justify-self-end sm:justify-self-start">
                    <StatusTag status={v.status} />
                  </div>
                  <p className="hidden sm:block text-sm text-muted">{v.status === "researching" ? "" : METHOD_LABELS[v.method]}</p>
                  <p className="hidden sm:block text-sm text-muted text-right">
                    {v.filed_at ? new Date(v.filed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
