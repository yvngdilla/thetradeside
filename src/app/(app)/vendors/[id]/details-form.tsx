"use client";

import { useActionState } from "react";
import { updateVendor, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Vendor } from "@/lib/types";

export function VendorDetailsForm({ vendor, defaultDescription }: { vendor: Vendor; defaultDescription: string }) {
  const [state, action] = useActionState<ActionState, FormData>(updateVendor, undefined);
  return (
    <form action={action} className="mt-5 grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="id" value={vendor.id} />
      <Field name="display_name" label="Vendor" defaultValue={vendor.display_name} />
      <Field
        name="seller_name"
        label="Name on the certificate"
        defaultValue={vendor.seller_name}
        hint="The “purchase from” line. A legal name is best, like Arteriors Home, Inc."
      />
      <div>
        <label htmlFor="method" className="label">
          How they take certificates
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
      <div className="sm:col-span-2">
        <label htmlFor="property_description" className="label">
          What you&rsquo;re buying from them
        </label>
        <input
          id="property_description"
          name="property_description"
          defaultValue={vendor.property_description ?? ""}
          placeholder={defaultDescription}
          className="field"
        />
        <p className="hint">Paragraph 5 of the certificate. Leave blank to use your usual description.</p>
      </div>
      <Field name="discount_info" label="Trade pricing" defaultValue={vendor.discount_info} />
      <Field name="account_status" label="Account status" defaultValue={vendor.account_status} hint="Like “Approved, account #1234”" />
      <Field name="rep_name" label="Rep name" defaultValue={vendor.rep_name} />
      <Field name="rep_email" label="Rep email" type="email" defaultValue={vendor.rep_email} />
      <Field
        name="aliases"
        label="Other websites for this vendor"
        defaultValue={vendor.aliases.join(", ")}
        hint="So the same company isn't added twice."
      />
      <div className="sm:col-span-2">
        <label htmlFor="notes" className="label">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={vendor.notes ?? ""} className="field" />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending="Saving…" className="btn btn-quiet">
          Save details
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} className="field" />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
