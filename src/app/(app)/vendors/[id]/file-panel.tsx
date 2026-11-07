"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fileByEmail, fileByPortal, markFiledManually, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Filing, Vendor } from "@/lib/types";
import { APP_NAME } from "@/lib/brand";
import { VENDOR_EMAIL_LIMITS, defaultVendorEmail, type VendorEmailParts } from "@/lib/vendor-email";

type Way = "email" | "portal" | "manual";

export function FilePanel({
  vendor,
  docs,
  gaps,
  outlookEmail,
  userEmail,
  emailParts,
  portalEnabled,
  lastFiled,
}: {
  vendor: Vendor;
  docs: { id: string; label: string }[];
  gaps: string[];
  outlookEmail: string | null;
  userEmail: string;
  emailParts: VendorEmailParts | null;
  portalEnabled: boolean;
  lastFiled: Filing | null;
}) {
  const suggested: Way =
    vendor.method === "web_form" || vendor.method === "portal_account" ? (portalEnabled ? "portal" : "manual") : vendor.method === "contact_rep" ? "manual" : "email";
  const [way, setWay] = useState<Way>(suggested);
  const [refile, setRefile] = useState(false);

  if (vendor.status === "researching") {
    return (
      <section className="sheet p-6">
        <h2 className="t-name">File the certificate</h2>
        <p className="text-muted mt-2">Available once the lookup finishes.</p>
      </section>
    );
  }

  if (vendor.status === "filed" && !refile) {
    return (
      <section className="sheet p-6">
        <h2 className="t-name">Certificate on file</h2>
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
    <section className="sheet p-6">
      <h2 className="t-name">File the certificate</h2>
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
          <div role="radiogroup" aria-label="How to file" className="mt-4 segmented">
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
              >
                {label}
              </button>
            ))}
          </div>
          {way === "email" ? (
            <EmailForm vendor={vendor} docs={docs} outlookEmail={outlookEmail} userEmail={userEmail} parts={emailParts} />
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

/** Whether a document looks like one the vendor asked for, so it starts ticked. */
function isRequested(label: string, required: string[]) {
  const wanted = required.join(" ").toLowerCase();
  return label.toLowerCase().split(/\W+/).some((w) => w.length > 3 && wanted.includes(w));
}

function DocumentChoices({ docs, required }: { docs: { id: string; label: string }[]; required: string[] }) {
  if (!docs.length) return null;
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
              defaultChecked={isRequested(d.label, required)}
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
  parts,
}: {
  vendor: Vendor;
  docs: { id: string; label: string }[];
  outlookEmail: string | null;
  userEmail: string;
  parts: VendorEmailParts | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(fileByEmail, undefined);
  const [delivery, setDelivery] = useState<"send" | "outlook">("send");
  const [attached, setAttached] = useState(() => docs.filter((d) => isRequested(d.label, vendor.required_documents)).map((d) => d.id));
  // Until the designer edits a field, it follows the standard wording (which names the ticked documents).
  const [subject, setSubject] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const standard = parts ? defaultVendorEmail(parts, docs.filter((d) => attached.includes(d.id)).map((d) => d.label)) : null;
  const edited = subject !== null || body !== null;

  return (
    <form
      action={action}
      className="mt-4"
      onChange={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.name === "documents") {
          setAttached(Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input[name="documents"]:checked')).map((i) => i.value));
        }
      }}
    >
      <input type="hidden" name="vendor_id" value={vendor.id} />
      <input type="hidden" name="delivery" value={delivery} />
      <label htmlFor="to" className="label">
        Vendor email
      </label>
      <input id="to" name="to" type="email" required defaultValue={vendor.trade_email ?? ""} className="field" />
      <DocumentChoices docs={docs} required={vendor.required_documents} />
      {standard ? (
        <div className="mt-5">
          <label htmlFor="subject" className="label">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            required
            maxLength={VENDOR_EMAIL_LIMITS.subject}
            value={subject ?? standard.subject}
            onChange={(e) => setSubject(e.target.value)}
            className="field"
          />
          <label htmlFor="body" className="label mt-4">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={15}
            maxLength={VENDOR_EMAIL_LIMITS.body}
            value={body ?? standard.text}
            onChange={(e) => setBody(e.target.value)}
            className="field leading-6"
          />
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <p className="hint">Edit anything, like adding a project name or account number.</p>
            {edited ? (
              <button
                type="button"
                className="hint underline underline-offset-2 hover:text-ink"
                onClick={() => {
                  setSubject(null);
                  setBody(null);
                }}
              >
                Use the standard wording
              </button>
            ) : null}
          </div>
        </div>
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
          ? `Sent from ${APP_NAME} with the signed certificate${attached.length ? " and ticked documents" : ""} attached. Replies go to ${userEmail}, and you get a copy.`
          : `Creates a draft in ${outlookEmail} with the certificate${attached.length ? " and ticked documents" : ""} attached. You press Send in Outlook.`}
      </p>
      <div className="mt-4">
        {delivery === "send" ? (
          <SubmitButton pending="Sending…">Send to vendor</SubmitButton>
        ) : (
          <SubmitButton pending="Creating draft…">Create Outlook draft</SubmitButton>
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
        <SubmitButton pending="Starting…">Fill in the application</SubmitButton>
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
        <SubmitButton pending="Saving…">Sign and mark as filed</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
