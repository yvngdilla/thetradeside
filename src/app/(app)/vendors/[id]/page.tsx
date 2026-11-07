import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace, loadProfileAndSigner } from "@/lib/workspace";
import { getOutlookConnection } from "@/lib/outlook";
import { has } from "@/lib/env";
import { profileGaps, type Filing, type TeamDocument, type Vendor } from "@/lib/types";
import { vendorEmailParts } from "@/lib/vendor-email";
import { StatusTag } from "@/components/status-tag";
import { AutoRefresh } from "@/components/ui";
import { cancelFiling, confirmPortalSubmitted } from "@/app/actions";
import { VendorInfo, Sheet } from "./vendor-info";
import { RemoveVendor } from "./remove-vendor";
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
  const emailParts = profile && signer && !gaps.length ? vendorEmailParts(vendor, profile, signer) : null;
  const busy = vendor.status === "researching" || active?.status === "preparing" || active?.status === "portal_running";

  const name = vendor.display_name || vendor.domain;
  // When the lookup needs checking, show the details before the filing box.
  const checkFirst = !active && (vendor.status === "needs_review" || vendor.status === "failed");
  const lastFiled = filings.find((f) => ["sent", "submitted", "manual"].includes(f.status)) ?? null;

  return (
    <div className="max-w-[720px]">
      <AutoRefresh active={busy} />
      <Link href="/" className="text-sm text-muted hover:text-ink">
        All vendors
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="t-title break-words min-w-0">{name}</h1>
          <StatusTag status={vendor.status} />
        </div>
        <p className="mt-1 text-muted">
          <a href={`https://${vendor.domain}`} target="_blank" rel="noreferrer" className="hover:text-ink underline-offset-4 hover:underline">
            {vendor.domain}
          </a>
          {vendor.aliases.length ? <span> and {vendor.aliases.join(", ")}</span> : null}
        </p>
        <p className="mt-4 text-[17px] leading-7">{nextStep(vendor, name, active)}</p>
      </header>

      <div className="mt-8 space-y-6">
        {checkFirst ? (
          <>
        <VendorInfo vendor={vendor} defaultDescription={profile?.property_description ?? ""} />
        {active ? (
          <ActiveFiling filing={active} />
        ) : (
          <FilePanel
            vendor={vendor}
            docs={docs.map((d) => ({ id: d.id, label: d.label }))}
            gaps={gaps}
            outlookEmail={outlook?.email ?? null}
            userEmail={ws.email}
            emailParts={emailParts}
            portalEnabled={has("BROWSERBASE_API_KEY")}
            lastFiled={lastFiled}
          />
        )}

          </>
        ) : (
          <>
        {active ? (
          <ActiveFiling filing={active} />
        ) : (
          <FilePanel
            vendor={vendor}
            docs={docs.map((d) => ({ id: d.id, label: d.label }))}
            gaps={gaps}
            outlookEmail={outlook?.email ?? null}
            userEmail={ws.email}
            emailParts={emailParts}
            portalEnabled={has("BROWSERBASE_API_KEY")}
            lastFiled={lastFiled}
          />
        )}

        <VendorInfo vendor={vendor} defaultDescription={profile?.property_description ?? ""} />
          </>
        )}

        {filings.length ? (
          <Sheet title="History">
            <ol className="space-y-5">
              {filings.map((f) => (
                <li key={f.id} className="grid grid-cols-[8.5rem_1fr] gap-x-4 text-[15px]">
                  <p className="text-muted">{new Date(f.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold">{HISTORY_LABEL[f.status]}</span>
                      {f.sent_to ? <span className="text-muted">, to {f.sent_to}</span> : null}
                    </p>
                    {f.error ? <p className="text-sm text-alert mt-1">{f.error}</p> : null}
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {f.certificate_path ? (
                        <a href={`/api/filings/${f.id}/certificate`} target="_blank" className="link">
                          View certificate
                        </a>
                      ) : null}
                      {f.steps.length ? (
                        <details className="text-muted">
                          <summary className="cursor-pointer hover:text-ink">Steps ({f.steps.length})</summary>
                          <ul className="mt-2 space-y-0.5">
                            {f.steps.map((st, i) => (
                              <li key={i} className={st.ok ? "" : "text-alert"}>
                                {st.text}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Sheet>
        ) : null}

        <div className="pt-2">
          <RemoveVendor vendorId={vendor.id} name={name} />
        </div>
      </div>
    </div>
  );
}

/** One plain sentence saying where things stand and what to do next. */
function nextStep(vendor: Vendor, name: string, active: Filing | undefined): string {
  if (active?.status === "draft_created") return `Your email to ${name} is waiting in Outlook.`;
  if (active?.status === "awaiting_review") return `The ${name} application is filled in and waiting for you to review and submit.`;
  if (active) return `Filing with ${name} now.`;
  switch (vendor.status) {
    case "researching":
      return `We're reading ${vendor.domain} to find out how ${name} takes certificates.`;
    case "failed":
      return "We couldn't read their website. Add their trade email or application page below, then file.";
    case "needs_review":
      return "We found some of what we need. Check the details below before filing.";
    case "filed":
      return `${name} has your certificate on file${vendor.filed_at ? ` since ${new Date(vendor.filed_at).toLocaleDateString("en-US", { dateStyle: "long" })}` : ""}.`;
    default:
      if (vendor.method === "email") return `${name} takes the certificate by email. Ready to send.`;
      if (vendor.method === "web_form" || vendor.method === "portal_account")
        return `${name} uses an online application. We can fill it in for you to review and submit.`;
      if (vendor.method === "contact_rep") return `${name} sets up trade accounts through a rep. Send the certificate to them, then mark it filed.`;
      return `Ready to file with ${name}.`;
  }
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
      <Sheet title="Getting started">
        <p className="text-muted">Preparing your signed certificate and opening the vendor&rsquo;s site.</p>
      </Sheet>
    );
  }

  if (filing.status === "draft_created") {
    return (
      <Sheet title="Draft is in Outlook">
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
      </Sheet>
    );
  }

  // Portal: running or waiting for review.
  const running = filing.status === "portal_running";
  return (
    <Sheet title={running ? "Filling in the application" : "Review and submit"}>
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
            <li key={i} className="border-l-2 border-alert pl-2">
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
            className="w-full aspect-[4/3] rounded-[var(--radius-sm)] border border-rule bg-sheet"
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
    </Sheet>
  );
}
