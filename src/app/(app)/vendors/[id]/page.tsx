import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace, loadProfileAndSigner } from "@/lib/workspace";
import { getOutlookConnection } from "@/lib/outlook";
import { has } from "@/lib/env";
import { profileGaps, type Filing, type TeamDocument, type Vendor } from "@/lib/types";
import { StatusTag, METHOD_LABELS } from "@/components/status-tag";
import { AutoRefresh } from "@/components/ui";
import { cancelFiling, confirmPortalSubmitted, deleteVendor, rerunResearch } from "@/app/actions";
import { VendorDetailsForm } from "./details-form";
import { FilePanel } from "./file-panel";
import { CheckSentButton } from "./check-sent";

export const maxDuration = 300;

export async function generateMetadata(props: PageProps<"/vendors/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createUserClient();
  const { data } = await supabase.from("vendors").select("display_name, domain").eq("id", id).maybeSingle();
  return { title: data?.display_name || data?.domain || "Vendor" };
}

const ACTIVE = ["preparing", "draft_created", "portal_running", "awaiting_review"];

export default async function VendorPage(props: PageProps<"/vendors/[id]">) {
  const { id } = await props.params;
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const [{ data: vendorRow }, { data: filingRows }, { data: docRows }, { profile, signer }, outlook] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", id).eq("team_id", ws.teamId).maybeSingle(),
    supabase.from("filings").select("*").eq("vendor_id", id).order("created_at", { ascending: false }),
    supabase.from("team_documents").select("*").eq("team_id", ws.teamId).order("created_at"),
    loadProfileAndSigner(ws),
    has("MICROSOFT_CLIENT_ID") ? getOutlookConnection(ws.userId) : Promise.resolve(null),
  ]);
  if (!vendorRow) notFound();
  const vendor = vendorRow as Vendor;
  const filings = (filingRows ?? []) as Filing[];
  const docs = (docRows ?? []) as TeamDocument[];
  const active = filings.find((f) => ACTIVE.includes(f.status));
  const gaps = profileGaps(profile, signer);
  const busy = vendor.status === "researching" || active?.status === "preparing" || active?.status === "portal_running";

  return (
    <div>
      <AutoRefresh active={busy} />
      <Link href="/" className="text-sm text-muted hover:text-ink">
        All vendors
      </Link>

      <header className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl leading-tight break-words">{vendor.display_name || vendor.domain}</h1>
          <p className="mt-1 text-muted">
            <a href={`https://${vendor.domain}`} target="_blank" rel="noreferrer" className="hover:text-ink underline-offset-4 hover:underline">
              {vendor.domain}
            </a>
            {vendor.aliases.length ? <span> and {vendor.aliases.join(", ")}</span> : null}
          </p>
        </div>
        <div className="sm:ml-auto pt-2">
          <StatusTag status={vendor.status} />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="font-display text-2xl">What we found</h2>
            {vendor.status === "researching" ? (
              <p className="mt-3 text-muted">Reading {vendor.domain} for its trade program. This usually takes under a minute.</p>
            ) : vendor.status === "failed" ? (
              <div className="mt-3">
                <p className="text-oxblood">{vendor.research_error}</p>
                <p className="text-muted mt-1 text-sm">Add the details below by hand, or try the lookup again.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="max-w-prose">{vendor.research_summary}</p>
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm max-w-prose">
                  <dt className="text-muted">How to submit</dt>
                  <dd>{METHOD_LABELS[vendor.method]}</dd>
                  {vendor.required_documents.length ? (
                    <>
                      <dt className="text-muted">They ask for</dt>
                      <dd>{vendor.required_documents.join(", ")}</dd>
                    </>
                  ) : null}
                  {vendor.discount_info ? (
                    <>
                      <dt className="text-muted">Trade pricing</dt>
                      <dd>{vendor.discount_info}</dd>
                    </>
                  ) : null}
                  {vendor.own_form_url ? (
                    <>
                      <dt className="text-muted">Their own form</dt>
                      <dd>
                        <a href={vendor.own_form_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                          Open the vendor&rsquo;s form
                        </a>
                      </dd>
                    </>
                  ) : null}
                  {vendor.research_confidence ? (
                    <>
                      <dt className="text-muted">Confidence</dt>
                      <dd className="capitalize">{vendor.research_confidence}</dd>
                    </>
                  ) : null}
                </dl>
                {vendor.notes ? <p className="text-sm border-l-2 border-oxblood pl-3 max-w-prose">{vendor.notes}</p> : null}
                {vendor.research_sources.length ? (
                  <details className="text-sm text-muted">
                    <summary className="cursor-pointer hover:text-ink">Pages we read</summary>
                    <ul className="mt-2 space-y-1">
                      {vendor.research_sources.map((s) => (
                        <li key={s} className="truncate">
                          <a href={s} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            {s}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            )}
            {vendor.status !== "researching" ? (
              <form action={rerunResearch.bind(null, vendor.id)} className="mt-4">
                <button className="text-sm text-muted hover:text-ink underline underline-offset-4">Look up again</button>
              </form>
            ) : null}
          </section>

          <section>
            <h2 className="font-display text-2xl">Details</h2>
            <p className="text-sm text-muted mt-1">Correct anything the lookup got wrong. The certificate uses these.</p>
            <VendorDetailsForm vendor={vendor} defaultDescription={profile?.property_description ?? ""} />
          </section>

          {filings.length ? (
            <section>
              <h2 className="font-display text-2xl">History</h2>
              <ol className="mt-4 space-y-6">
                {filings.map((f) => (
                  <li key={f.id} className="border-l border-rule pl-4">
                    <p className="text-sm">
                      <span className="font-semibold">{HISTORY_LABEL[f.status]}</span>{" "}
                      <span className="text-muted">
                        {new Date(f.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        {f.sent_to ? `, to ${f.sent_to}` : ""}
                      </span>
                    </p>
                    {f.certificate_path ? (
                      <a href={`/api/filings/${f.id}/certificate`} target="_blank" className="text-sm underline underline-offset-4">
                        View certificate
                      </a>
                    ) : null}
                    {f.error ? <p className="text-sm text-oxblood mt-1">{f.error}</p> : null}
                    {f.steps.length ? (
                      <ul className="mt-2 text-sm text-muted space-y-0.5">
                        {f.steps.map((s, i) => (
                          <li key={i} className={s.ok ? "" : "text-oxblood"}>
                            {s.text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <form action={deleteVendor.bind(null, vendor.id)}>
            <button className="btn btn-danger text-sm">Remove vendor</button>
          </form>
        </div>

        <aside className="lg:sticky lg:top-20 self-start">
          {active ? (
            <ActiveFiling filing={active} />
          ) : (
            <FilePanel
              vendor={vendor}
              docs={docs.map((d) => ({ id: d.id, label: d.label }))}
              gaps={gaps}
              outlookEmail={outlook?.email ?? null}
              portalEnabled={has("BROWSERBASE_API_KEY")}
              lastFiled={filings.find((f) => ["sent", "submitted", "manual"].includes(f.status)) ?? null}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

const HISTORY_LABEL: Record<Filing["status"], string> = {
  preparing: "Preparing",
  draft_created: "Draft in Outlook",
  portal_running: "Filling the online form",
  awaiting_review: "Online form ready for review",
  sent: "Emailed",
  submitted: "Submitted online",
  manual: "Marked as filed",
  failed: "Didn't finish",
  cancelled: "Cancelled",
};

function ActiveFiling({ filing }: { filing: Filing }) {
  if (filing.status === "preparing") {
    return (
      <Panel title="Getting started">
        <p className="text-muted">Preparing your signed certificate and opening the vendor&rsquo;s site.</p>
      </Panel>
    );
  }

  if (filing.status === "draft_created") {
    return (
      <Panel title="Draft is in Outlook">
        <p>
          The email to <span className="font-semibold">{filing.sent_to}</span> is in your Drafts with the certificate attached. Review it
          and press Send in Outlook.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {filing.outlook_web_link ? (
            <a href={filing.outlook_web_link} target="_blank" rel="noreferrer" className="btn btn-primary">
              Open in Outlook
            </a>
          ) : null}
          <a href={`/api/filings/${filing.id}/certificate`} target="_blank" className="btn btn-quiet">
            View certificate
          </a>
        </div>
        <p className="text-sm text-muted mt-4">We check for the sent email every hour and mark the vendor as filed.</p>
        <div className="flex flex-wrap gap-3 mt-3 items-start">
          <CheckSentButton filingId={filing.id} />
          <form action={cancelFiling.bind(null, filing.id)}>
            <button className="btn btn-quiet">Cancel</button>
          </form>
        </div>
      </Panel>
    );
  }

  // Portal: running or waiting for review.
  const running = filing.status === "portal_running";
  return (
    <Panel title={running ? "Filling in the application" : "Review and submit"}>
      {running ? (
        <p className="text-muted">Watch it work below. It will stop before submitting anything.</p>
      ) : (
        <p>
          Check the form in the window below, finish anything listed, then press the vendor&rsquo;s own submit button. Nothing has been
          submitted yet.
        </p>
      )}
      {filing.open_items.length ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {filing.open_items.map((item, i) => (
            <li key={i} className="border-l-2 border-oxblood pl-2">
              <span className="font-semibold">{item.label}:</span> {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {filing.live_view_url ? (
        <div className="mt-4">
          <iframe
            src={filing.live_view_url}
            title="Vendor application"
            className="w-full aspect-[4/3] rounded-md border border-rule bg-sheet"
            sandbox="allow-same-origin allow-scripts"
            allow="clipboard-read; clipboard-write"
          />
          <a href={filing.live_view_url} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4 mt-1 inline-block">
            Open full screen
          </a>
        </div>
      ) : null}
      {!running ? (
        <div className="flex flex-wrap gap-2 mt-4">
          <form action={confirmPortalSubmitted.bind(null, filing.id)}>
            <button className="btn btn-primary">I submitted it</button>
          </form>
          <form action={cancelFiling.bind(null, filing.id)}>
            <button className="btn btn-quiet">Cancel</button>
          </form>
        </div>
      ) : null}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-sheet border border-rule rounded-lg p-5">
      <h2 className="font-display text-2xl mb-3">{title}</h2>
      {children}
    </section>
  );
}
