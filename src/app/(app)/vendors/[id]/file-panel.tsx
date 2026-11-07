"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fileByEmail, fileByPortal, markFiledManually, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Filing, Vendor } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";

type Way = "email" | "portal" | "manual";

export function FilePanel({
  vendor,
  docs,
  gaps,
  outlookEmail,
  userEmail,
  emailPreview,
  portalEnabled,
  lastFiled,
}: {
  vendor: Vendor;
  docs: { id: string; label: string }[];
  gaps: string[];
  outlookEmail: string | null;
  userEmail: string;
  emailPreview: { subject: string; text: string } | null;
  portalEnabled: boolean;
  lastFiled: Filing | null;
}) {
  const suggested: Way =
    vendor.method === "web_form" || vendor.method === "portal_account" ? (portalEnabled ? "portal" : "manual") : vendor.method === "contact_rep" ? "manual" : "email";
  const [way, setWay] = useState<Way>(suggested);
  const [refile, setRefile] = useState(false);

  if (vendor.status === "researching") {
    return (
      <section className="bg-sheet border border-rule rounded-lg p-5">
        <h2 className="font-display text-2xl">File the certificate</h2>
        <p className="text-muted mt-2">Available once the lookup finishes.</p>
      </section>
    );
  }

  if (vendor.status === "filed" && !refile) {
    return (
      <section className="bg-sheet border border-rule rounded-lg p-5">
        <h2 className="font-display text-2xl">Filed</h2>
        <p className="mt-2">
          Certificate on file since{" "}
          {vendor.filed_at ? new Date(vendor.filed_at).toLocaleDateString("en-US", { dateStyle: "long" }) : "earlier"}.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {lastFiled?.certificate_path ? (
            <a href={`/api/filings/${lastFiled.id}/certificate`} target="_blank" className="btn btn-quiet">
              View certificate
            </a>
          ) : null}
          <button type="button" className="btn btn-quiet" onClick={() => setRefile(true)}>
            File again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-sheet border border-rule rounded-lg p-5">
      <h2 className="font-display text-2xl">File the certificate</h2>
      {gaps.length ? (
        <p className="mt-3 text-sm">
          Finish your details in{" "}
          <Link href="/settings" className="underline underline-offset-4 font-semibold">
            Settings
          </Link>{" "}
          first: {gaps.join(", ")}.
        </p>
      ) : (
        <>
          <div role="radiogroup" aria-label="How to file" className="mt-4 grid grid-cols-3 gap-1 bg-mist rounded-md p-1 text-sm">
            {(
              [
                ["email", "Email"],
                ["portal", "Online form"],
                ["manual", "Other"],
              ] as [Way, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={way === key}
                onClick={() => setWay(key)}
                className={`py-1.5 rounded ${way === key ? "bg-sheet font-semibold text-chip shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {way === "email" ? (
            <EmailForm vendor={vendor} docs={docs} outlookEmail={outlookEmail} userEmail={userEmail} preview={emailPreview} />
          ) : way === "portal" ? (
            <PortalForm vendor={vendor} docs={docs} enabled={portalEnabled} />
          ) : (
            <ManualForm vendor={vendor} />
          )}
        </>
      )}
    </section>
  );
}

function DocumentChoices({ docs, required }: { docs: { id: string; label: string }[]; required: string[] }) {
  if (!docs.length) return null;
  const wanted = required.join(" ").toLowerCase();
  return (
    <fieldset className="mt-4">
      <legend className="label">Also attach</legend>
      <div className="space-y-1.5">
        {docs.map((d) => (
          <label key={d.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="documents"
              value={d.id}
              defaultChecked={d.label.toLowerCase().split(/\W+/).some((w) => w.length > 3 && wanted.includes(w))}
            />
            {d.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function EmailForm({
  vendor,
  docs,
  outlookEmail,
  userEmail,
  preview,
}: {
  vendor: Vendor;
  docs: { id: string; label: string }[];
  outlookEmail: string | null;
  userEmail: string;
  preview: { subject: string; text: string } | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(fileByEmail, undefined);
  const [delivery, setDelivery] = useState<"send" | "outlook">("send");
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="vendor_id" value={vendor.id} />
      <input type="hidden" name="delivery" value={delivery} />
      <label htmlFor="to" className="label">
        Vendor email
      </label>
      <input id="to" name="to" type="email" required defaultValue={vendor.trade_email ?? ""} className="field" />
      <DocumentChoices docs={docs} required={vendor.required_documents} />
      <label htmlFor="note" className="label mt-4">
        Add a note <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea id="note" name="note" rows={2} className="field" placeholder="Like a project name or your account number" />
      {preview ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Preview the email</summary>
          <div className="mt-2 border-l-2 border-rule pl-3">
            <p className="font-semibold">{preview.subject}</p>
            <p className="whitespace-pre-line mt-2 text-muted">{preview.text}</p>
            <p className="mt-2 text-muted">Attached: signed resale certificate (PDF)</p>
          </div>
        </details>
      ) : null}
      {outlookEmail ? (
        <fieldset className="mt-4 text-sm space-y-1.5">
          <legend className="label">Send it</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="_delivery" checked={delivery === "send"} onChange={() => setDelivery("send")} />
            Now, from {APP_NAME}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="_delivery" checked={delivery === "outlook"} onChange={() => setDelivery("outlook")} />
            As a draft in my Outlook ({outlookEmail})
          </label>
        </fieldset>
      ) : null}
      <p className="hint mt-3">
        {delivery === "send"
          ? `Sent from ${APP_NAME} with the signed certificate attached. Replies go to ${userEmail}, and you get a copy.`
          : `Creates a draft in ${outlookEmail} with the certificate attached. You press Send in Outlook.`}
      </p>
      <div className="mt-4">
        {delivery === "send" ? (
          <SubmitButton pending="Sending">Send to vendor</SubmitButton>
        ) : (
          <SubmitButton pending="Creating draft">Create Outlook draft</SubmitButton>
        )}
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function PortalForm({ vendor, docs, enabled }: { vendor: Vendor; docs: { id: string; label: string }[]; enabled: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(fileByPortal, undefined);
  if (!enabled) {
    return <p className="mt-4 text-sm text-muted">Online form filling isn&rsquo;t set up for this workspace yet.</p>;
  }
  const start = vendor.application_url || vendor.trade_url;
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="vendor_id" value={vendor.id} />
      <p className="text-sm">
        Opens {start ? <span className="break-all">{start}</span> : `${vendor.domain}`} in a secure browser and fills in the
        application with your details and certificate.
      </p>
      <p className="text-sm text-muted mt-2">
        It stops before submitting. You review it, handle any sign-in or verification, and press the vendor&rsquo;s submit button
        yourself.
      </p>
      <DocumentChoices docs={docs} required={vendor.required_documents} />
      <div className="mt-4">
        <SubmitButton pending="Starting">Fill in the application</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function ManualForm({ vendor }: { vendor: Vendor }) {
  const [state, action] = useActionState<ActionState, FormData>(markFiledManually, undefined);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="vendor_id" value={vendor.id} />
      <p className="text-sm">
        For vendors that take certificates through a rep, by phone or in person. This signs a certificate you can download and
        marks the vendor as filed.
      </p>
      <label htmlFor="note" className="label mt-4">
        How you sent it
      </label>
      <input id="note" name="note" className="field" placeholder="Like “Emailed to rep, Dana”" />
      <div className="mt-4">
        <SubmitButton pending="Saving">Sign and mark as filed</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
