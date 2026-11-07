"use client";

import { useActionState } from "react";
import { inviteMember, saveProfile, saveSigner, uploadDocument, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import type { BusinessProfile, Signer } from "@/lib/types";

function Input({
  name,
  label,
  defaultValue,
  hint,
  className = "",
  ...rest
}: { name: string; label: string; defaultValue?: string | null; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} className="field" {...rest} />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: BusinessProfile | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, undefined);
  const p = profile;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-6">
      <Input name="business_name" label="Firm name" defaultValue={p?.business_name} className="sm:col-span-3" required hint="Used in emails to vendors." />
      <Input name="seller_permit" label="Seller's permit number" defaultValue={p?.seller_permit} className="sm:col-span-3" required />
      <Input
        name="purchaser_name"
        label="Name of purchaser"
        defaultValue={p?.purchaser_name}
        className="sm:col-span-6"
        required
        hint="Exactly as it should read on the certificate, like “Jane Doe (Doe Design, LLC) / DBA Doe Interiors”."
      />
      <Input
        name="business_type"
        label="What your business sells"
        defaultValue={p?.business_type}
        className="sm:col-span-6"
        required
        hint="Paragraph 2, like “Furniture, accessories, surface materials, plumbing, fabric and wallcoverings”."
      />
      <Input
        name="property_description"
        label="What you usually buy for resale"
        defaultValue={p?.property_description}
        className="sm:col-span-6"
        required
        hint="Paragraph 5. Each vendor gets a version matched to what they sell; this is the fallback."
      />
      <Input name="address_line1" label="Street address" defaultValue={p?.address_line1} className="sm:col-span-4" required autoComplete="address-line1" />
      <Input name="address_line2" label="Suite or unit" defaultValue={p?.address_line2} className="sm:col-span-2" autoComplete="address-line2" />
      <Input name="city" label="City" defaultValue={p?.city} className="sm:col-span-3" required autoComplete="address-level2" />
      <Input name="state" label="State" defaultValue={p?.state || "CA"} className="sm:col-span-1" maxLength={2} required />
      <Input name="postal_code" label="ZIP" defaultValue={p?.postal_code} className="sm:col-span-2" required autoComplete="postal-code" />
      <Input name="phone" label="Phone" defaultValue={p?.phone} className="sm:col-span-3" type="tel" required autoComplete="tel" />
      <Input name="website" label="Website" defaultValue={p?.website} className="sm:col-span-3" />
      <div className="sm:col-span-6">
        <label htmlFor="email_note" className="label">
          Extra line for vendor emails
        </label>
        <textarea id="email_note" name="email_note" rows={2} defaultValue={p?.email_note ?? ""} className="field" />
        <p className="hint">Optional. Added to every certificate email, like your ASID membership number.</p>
      </div>
      <div className="sm:col-span-6">
        <SubmitButton pending="Saving…">Save certificate details</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function SignerForm({ signer, signatureUrl }: { signer: Signer | null; signatureUrl: string | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSigner, undefined);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Input name="printed_name" label="Printed name" defaultValue={signer?.printed_name} required autoComplete="name" />
      <Input name="title" label="Title" defaultValue={signer?.title} required placeholder="Owner / Principal" />
      <div className="sm:col-span-2">
        <p className="label">Signature</p>
        <SignaturePad existingUrl={signatureUrl} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pending="Saving…" className="btn btn-quiet">
          Save signing details
        </SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function DocumentForm() {
  const [state, action] = useActionState<ActionState, FormData>(uploadDocument, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
      <Input name="label" label="Name" placeholder="Seller's permit" />
      <div>
        <label htmlFor="file" className="label">
          File
        </label>
        <input id="file" name="file" type="file" accept="application/pdf,image/png,image/jpeg" className="field !py-1.5" />
      </div>
      <SubmitButton pending="Uploading…" className="btn btn-quiet">
        Add document
      </SubmitButton>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState<ActionState, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="flex flex-wrap gap-2 items-end">
      <Input name="email" label="Add someone by email" type="email" className="grow" placeholder="name@yourstudio.com" />
      <SubmitButton pending="Adding…" className="btn btn-quiet">
        Add to workspace
      </SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
