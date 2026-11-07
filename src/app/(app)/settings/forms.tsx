"use client";

import { createContext, useActionState, useContext, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteDocument,
  fillFromDocument,
  inviteMember,
  saveProfile,
  saveSigner,
  uploadDocument,
  type ActionState,
  type ExtractState,
} from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import { SignaturePad } from "@/components/signature-pad";
import { FilePick } from "@/components/file-pick";
import type { ExtractedProfile } from "@/lib/extract-profile";
import type { BusinessProfile, Signer, TeamDocument } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Filling from a document: one upload fills both the certificate      */
/* details and the signer's name and title, for her to check and save. */
/* ------------------------------------------------------------------ */

type Fill = { values: ExtractedProfile; version: number };
const FillContext = createContext<{ fill: Fill; setValues: (v: ExtractedProfile) => void }>({
  fill: { values: {}, version: 0 },
  setValues: () => {},
});

export function FillProvider({ children }: { children: React.ReactNode }) {
  const [fill, setFill] = useState<Fill>({ values: {}, version: 0 });
  const setValues = (values: ExtractedProfile) => setFill((f) => ({ values, version: f.version + 1 }));
  return <FillContext.Provider value={{ fill, setValues }}>{children}</FillContext.Provider>;
}

export function FillFromDocument() {
  const { setValues } = useContext(FillContext);
  const [state, action] = useActionState<ExtractState, FormData>(async (prev, fd) => {
    const result = await fillFromDocument(prev, fd);
    if (result?.values) setValues(result.values);
    return result;
  }, undefined);
  const count = state?.values ? Object.keys(state.values).length : 0;

  return (
    <form action={action} className="mb-7">
      <FillPick />
      {state?.error ? <p className="text-sm mt-2 text-alert">{state.error}</p> : null}
      {count ? (
        <p className="mt-3 rounded-[var(--radius-md)] bg-forest-wash text-forest px-4 py-3 text-sm">
          Filled in {count} {count === 1 ? "detail" : "details"} from {state?.fileName}. They&rsquo;re highlighted below. Check
          them, then save.
          {state?.savedAs ? ` Your ${state.savedAs.toLowerCase()} was also added to Documents.` : ""}
        </p>
      ) : null}
    </form>
  );
}

function FillPick() {
  const { pending } = useFormStatus();
  if (pending) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-forest bg-forest-wash px-4 py-4 flex items-center gap-3 text-[15px]">
        <span aria-hidden className="step-spinner" />
        Reading your document
      </div>
    );
  }
  return (
    <FilePick
      name="file"
      accept="application/pdf,image/png,image/jpeg"
      prompt="Fill these in from a document"
      detail="Upload a resale certificate you've filed before, or your seller's permit. PDF or photo, up to 4 MB."
      autoSubmit
    />
  );
}

function Input({
  name,
  label,
  defaultValue,
  hint,
  className = "",
  filled = false,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
  className?: string;
  filled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} className={`field${filled ? " field-filled" : ""}`} {...rest} />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: BusinessProfile | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveProfile, undefined);
  const { fill } = useContext(FillContext);
  const f = fill.values;
  // A filled value wins over what's saved: she just chose that document.
  const v = (key: keyof ExtractedProfile & keyof BusinessProfile) => f[key] || (profile?.[key] as string | null | undefined) || "";
  const on = (key: keyof ExtractedProfile) => !!f[key];

  return (
    <form key={fill.version} action={action} className="grid gap-5 sm:grid-cols-6">
      <Input name="business_name" label="Firm name" defaultValue={v("business_name")} filled={on("business_name")} className="sm:col-span-3" required hint="Used in emails to vendors." />
      <Input name="seller_permit" label="Seller's permit number" defaultValue={v("seller_permit")} filled={on("seller_permit")} className="sm:col-span-3" required />
      <Input
        name="purchaser_name"
        label="Name of purchaser"
        defaultValue={v("purchaser_name")}
        filled={on("purchaser_name")}
        className="sm:col-span-6"
        required
        hint="Exactly as it should read on the certificate, like “Jane Doe (Doe Design, LLC) / DBA Doe Interiors”."
      />
      <Input
        name="business_type"
        label="What your business sells"
        defaultValue={v("business_type")}
        filled={on("business_type")}
        className="sm:col-span-6"
        required
        hint="Paragraph 2, like “Furniture, accessories, surface materials, plumbing, fabric and wallcoverings”."
      />
      <Input
        name="property_description"
        label="What you usually buy for resale"
        defaultValue={v("property_description")}
        filled={on("property_description")}
        className="sm:col-span-6"
        required
        hint="Paragraph 5. Each vendor gets a version matched to what they sell; this is the fallback."
      />
      <Input name="address_line1" label="Street address" defaultValue={v("address_line1")} filled={on("address_line1")} className="sm:col-span-4" required autoComplete="address-line1" />
      <Input name="address_line2" label="Suite or unit" defaultValue={v("address_line2")} filled={on("address_line2")} className="sm:col-span-2" autoComplete="address-line2" />
      <Input name="city" label="City" defaultValue={v("city")} filled={on("city")} className="sm:col-span-3" required autoComplete="address-level2" />
      <Input name="state" label="State" defaultValue={v("state") || "CA"} filled={on("state")} className="sm:col-span-1" maxLength={2} required />
      <Input name="postal_code" label="ZIP" defaultValue={v("postal_code")} filled={on("postal_code")} className="sm:col-span-2" required autoComplete="postal-code" />
      <Input name="phone" label="Phone" defaultValue={v("phone")} filled={on("phone")} className="sm:col-span-3" type="tel" required autoComplete="tel" />
      <Input name="website" label="Website" defaultValue={v("website")} filled={on("website")} className="sm:col-span-3" />
      <div className="sm:col-span-6">
        <label htmlFor="email_note" className="label">
          Extra line for vendor emails
        </label>
        <textarea id="email_note" name="email_note" rows={2} defaultValue={profile?.email_note ?? ""} className="field" />
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
  const { fill } = useContext(FillContext);
  return <SignerFields key={fill.version} signer={signer} signatureUrl={signatureUrl} filled={fill.values} />;
}

function SignerFields({ signer, signatureUrl, filled }: { signer: Signer | null; signatureUrl: string | null; filled: ExtractedProfile }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSigner, undefined);
  const [printedName, setPrintedName] = useState(filled.printed_name || signer?.printed_name || "");
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <Input
        name="printed_name"
        label="Printed name"
        defaultValue={printedName}
        filled={!!filled.printed_name}
        required
        autoComplete="name"
        onChange={(e) => setPrintedName(e.target.value)}
      />
      <Input
        name="title"
        label="Title"
        defaultValue={filled.title || signer?.title}
        filled={!!filled.title}
        required
        placeholder="Owner / Principal"
      />
      <div className="sm:col-span-2">
        <p className="label">Signature</p>
        <SignaturePad existingUrl={signatureUrl} name={printedName} />
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

/* ------------------------------------------------------------------ */
/* Documents: a fixed set of slots vendors commonly ask for, plus any   */
/* others she names. Choosing a file saves it straight away.            */
/* ------------------------------------------------------------------ */

const SLOTS = [
  { label: "Seller's permit", hint: "From CDTFA. Most vendors ask for this." },
  { label: "Business license", hint: "From your city or county." },
  { label: "W-9", hint: "Some vendors need it to open a trade account." },
  { label: "Business card", hint: "A few vendors ask for proof you're in the trade." },
];

export function DocumentSlots({ docs }: { docs: TeamDocument[] }) {
  const byLabel = new Map(docs.map((d) => [d.label, d]));
  const others = docs.filter((d) => !SLOTS.some((s) => s.label === d.label));
  return (
    <div>
      <ul className="divide-y divide-rule border-y border-rule">
        {SLOTS.map((s) => (
          <DocumentRow key={s.label} label={s.label} hint={s.hint} doc={byLabel.get(s.label) ?? null} />
        ))}
        {others.map((d) => (
          <DocumentRow key={d.id} label={d.label} doc={d} />
        ))}
      </ul>
      <OtherDocument />
    </div>
  );
}

function DocumentRow({ label, hint, doc }: { label: string; hint?: string; doc: TeamDocument | null }) {
  const [state, action] = useActionState<ActionState, FormData>(uploadDocument, undefined);
  return (
    <li className="py-3">
      <form action={action} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input type="hidden" name="label" value={label} />
        <span
          aria-hidden
          className={`w-[14px] h-[14px] shrink-0 rounded-full grid place-items-center ${doc ? "bg-forest" : "border border-control"}`}
        >
          {doc ? (
            <svg viewBox="0 0 10 10" className="w-2 h-2 text-on-forest" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 5.2 4.2 7.2 8 2.8" />
            </svg>
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted truncate">{doc ? doc.file_name : hint}</p>
        </div>
        <DocumentActions doc={doc} />
      </form>
      {state?.error ? <p className="text-sm text-alert mt-1 ml-[30px]">{state.error}</p> : null}
    </li>
  );
}

function DocumentActions({ doc }: { doc: TeamDocument | null }) {
  const { pending } = useFormStatus();
  const input = useRef<HTMLInputElement>(null);
  const pick = (
    <input
      ref={input}
      type="file"
      name="file"
      accept="application/pdf,image/png,image/jpeg"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => e.target.files?.length && e.target.form?.requestSubmit()}
    />
  );
  if (pending) {
    return (
      <span className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden className="step-spinner" />
        Saving
      </span>
    );
  }
  if (!doc) {
    return (
      <>
        {pick}
        <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => input.current?.click()}>
          Upload
        </button>
      </>
    );
  }
  return (
    <span className="flex items-center gap-4 text-sm text-muted">
      {pick}
      <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
        View
      </a>
      <button type="button" className="underline underline-offset-4 hover:text-ink" onClick={() => input.current?.click()}>
        Replace
      </button>
      <button type="submit" formAction={deleteDocument.bind(null, doc.id)} className="underline underline-offset-4 hover:text-alert">
        Remove
      </button>
    </span>
  );
}

function OtherDocument() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await uploadDocument(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  }, undefined);

  if (!open) {
    return (
      <div className="mt-4 flex items-center gap-4">
        <button type="button" className="btn btn-quiet !py-1.5 !px-4" onClick={() => setOpen(true)}>
          Add something else
        </button>
        {state?.ok ? <p className="text-sm text-forest">{state.ok}.</p> : null}
      </div>
    );
  }
  return (
    <form action={action} className="mt-4 rounded-[var(--radius-md)] border border-rule p-4 grid gap-4">
      <Input name="label" label="What is it?" placeholder="Insurance certificate" required autoFocus />
      <FilePick name="file" accept="application/pdf,image/png,image/jpeg" prompt="Choose the file" detail="PDF or photo, up to 2.5 MB so it fits in vendor emails." />
      <div className="flex gap-2">
        <SubmitButton pending="Saving…" className="btn btn-quiet">
          Save document
        </SubmitButton>
        <button type="button" className="btn btn-quiet border-transparent" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <FormMessage state={state?.error ? state : undefined} />
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
