"use client";

import { useActionState, useState } from "react";
import { rerunResearch, updateVendor, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import { METHOD_LABELS } from "@/components/status-tag";
import type { Vendor } from "@/lib/types";

/**
 * Everything we know about the vendor in one box. Reads as a short list of
 * facts; Edit turns the same box into a form. Opens in edit mode when the
 * lookup needs checking.
 */
export function VendorInfo({ vendor, defaultDescription }: { vendor: Vendor; defaultDescription: string }) {
  const needsYou = vendor.status === "needs_review" || vendor.status === "failed";
  const [editing, setEditing] = useState(needsYou);
  // Close the form when a save succeeds, inside the action instead of an effect.
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await updateVendor(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  if (vendor.status === "researching") {
    return (
      <Sheet title="Trade account">
        <p className="text-muted">Reading {vendor.domain} for its trade program. This usually takes under a minute.</p>
      </Sheet>
    );
  }

  if (editing) {
    return (
      <Sheet title="Trade account">
        {needsYou ? (
          <p className="mb-6 rounded-[var(--radius-md)] bg-alert-wash text-alert px-4 py-3 text-sm">
            {vendor.status === "failed" ? `${vendor.research_error} ` : ""}
            {vendor.research_summary && vendor.status !== "failed" ? `${vendor.research_summary} ` : ""}
            Check these details before filing.
          </p>
        ) : null}
        <form action={action}>
          <input type="hidden" name="id" value={vendor.id} />

          <Group title="How they take certificates">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="method" className="label">
                  Method
                </label>
                <select id="method" name="method" defaultValue={vendor.method} className="field">
                  <option value="email">Email</option>
                  <option value="web_form">Online form</option>
                  <option value="portal_account">Account sign-up</option>
                  <option value="contact_rep">Through a rep</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
              <Field name="trade_email" label="Trade email" type="email" defaultValue={vendor.trade_email} />
              <Field name="application_url" label="Application page" type="url" defaultValue={vendor.application_url} />
              <Field name="trade_url" label="Trade program page" type="url" defaultValue={vendor.trade_url} />
            </div>
          </Group>

          <Group title="On the certificate">
            <div className="grid gap-4">
              <Field
                name="seller_name"
                label="Purchase from"
                defaultValue={vendor.seller_name}
                hint="The vendor's name on line 3. A legal name is best, like Arteriors Home, Inc."
              />
              <Field
                name="property_description"
                label="What you're buying from them"
                defaultValue={vendor.property_description}
                placeholder={defaultDescription}
                hint="Line 5. Leave blank to use your usual description."
              />
            </div>
          </Group>

          <Group title="Your account">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="display_name" label="Vendor name" defaultValue={vendor.display_name} />
              <Field name="account_status" label="Account status" defaultValue={vendor.account_status} placeholder="Approved, account #1234" />
              <Field name="discount_info" label="Trade pricing" defaultValue={vendor.discount_info} placeholder="20% off retail" />
              <Field name="aliases" label="Other websites" defaultValue={vendor.aliases.join(", ")} hint="So the same company isn't added twice." />
              <Field name="rep_name" label="Rep name" defaultValue={vendor.rep_name} />
              <Field name="rep_email" label="Rep email" type="email" defaultValue={vendor.rep_email} />
            </div>
            <div className="mt-4">
              <label htmlFor="notes" className="label">
                Notes
              </label>
              <textarea id="notes" name="notes" rows={2} defaultValue={vendor.notes ?? ""} className="field" />
            </div>
          </Group>

          <div className="flex flex-wrap gap-2 pt-2">
            <SubmitButton pending="Saving…">Save changes</SubmitButton>
            {!needsYou || vendor.status === "needs_review" ? (
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>
                Cancel
              </button>
            ) : null}
          </div>
          <FormMessage state={state?.error ? state : undefined} />
        </form>
      </Sheet>
    );
  }

  const rep = [vendor.rep_name, vendor.rep_email].filter(Boolean).join(", ");
  return (
    <Sheet
      title="Trade account"
      action={
        <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setEditing(true)}>
          Edit
        </button>
      }
    >
      {vendor.notes ? <p className="mb-5 rounded-[var(--radius-md)] bg-alert-wash text-alert px-4 py-3 text-sm">{vendor.notes}</p> : null}

      <Facts
        rows={[
          ["How they take it", METHOD_LABELS[vendor.method]],
          ["Trade email", vendor.trade_email],
          ["Application", vendor.application_url ? <ExtLink href={vendor.application_url}>Open the application</ExtLink> : null],
          ["They ask for", vendor.required_documents.join(", ") || null],
          ["Trade pricing", vendor.discount_info],
          ["Account", vendor.account_status],
          ["Rep", rep || null],
        ]}
      />

      <hr className="my-5 border-rule" />
      <p className="label !mb-3">On the certificate</p>
      <Facts
        rows={[
          ["Purchase from", vendor.seller_name || vendor.display_name],
          ["Buying", vendor.property_description || defaultDescription],
        ]}
      />

      {vendor.research_summary ? (
        <>
          <hr className="my-5 border-rule" />
          <p className="text-sm text-muted max-w-prose">{vendor.research_summary}</p>
        </>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        {vendor.trade_url ? <ExtLink href={vendor.trade_url}>Trade program page</ExtLink> : null}
        {vendor.own_form_url ? <ExtLink href={vendor.own_form_url}>Their own form</ExtLink> : null}
        {vendor.research_sources.length ? (
          <details>
            <summary className="cursor-pointer hover:text-ink">Pages we read ({vendor.research_sources.length})</summary>
            <ul className="mt-2 space-y-1">
              {vendor.research_sources.map((s) => (
                <li key={s} className="truncate max-w-[36rem]">
                  <ExtLink href={s}>{s}</ExtLink>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <form action={rerunResearch.bind(null, vendor.id)}>
          <button className="hover:text-ink underline underline-offset-4">Look up again</button>
        </form>
      </div>
    </Sheet>
  );
}

export function Sheet({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sheet p-6">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="t-name">{title}</h2>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-7">
      <legend className="text-sm font-semibold text-muted mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return <p className="text-sm text-muted">Nothing yet. Use Edit to add their details.</p>;
  return (
    <dl className="grid gap-y-3 sm:grid-cols-[8.5rem_1fr] sm:gap-x-4 sm:gap-y-2.5 text-[15px]">
      {shown.map(([k, v]) => (
        // On phones each pair stacks (label above value); from sm up the pair joins the two-column grid.
        <div key={k} className="sm:contents">
          <dt className="text-sm text-muted sm:text-[15px]">{k}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link">
      {children}
    </a>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  hint,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="field" />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
