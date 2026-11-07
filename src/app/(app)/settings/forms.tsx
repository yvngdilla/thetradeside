"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteDocument,
  inviteMember,
  readPastCertificate,
  renameDocument,
  saveProfile,
  saveSigner,
  uploadDocument,
  type ActionState,
  type ImportState,
} from "@/app/actions";
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES } from "@/lib/documents";
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
  const formRef = useRef<HTMLFormElement>(null);
  const p = profile;
  return (
    <>
    <CertificateImport formRef={formRef} />
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => e.currentTarget.querySelectorAll(".is-imported").forEach((el) => el.classList.remove("is-imported"))}
      className="grid gap-5 sm:grid-cols-6"
    >
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
    </>
  );
}

/**
 * Upload a certificate filed before (PDF or photo). Its details are read on the
 * server and written into the certificate details form for the designer to
 * check and save. Nothing is saved until they press Save.
 */
function CertificateImport({ formRef }: { formRef: React.RefObject<HTMLFormElement | null> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<ImportState, FormData>(async (prev, fd) => {
    const file = fd.get("certificate");
    if (file instanceof File && file.size > 0 && file.type !== "application/pdf") {
      try {
        fd.set("certificate", await prepareImage(file));
      } catch {
        return { error: "Couldn't open that image. Upload a JPG, PNG or PDF of the certificate." };
      }
    }
    return readPastCertificate(prev, fd);
  }, undefined);

  useEffect(() => {
    if (fileRef.current) fileRef.current.value = "";
    const form = formRef.current;
    if (!form || !state?.details) return;
    const details: Record<string, string> = { ...state.details };
    // A new street address without a suite shouldn't keep the old suite.
    if (details.address_line1 && !details.address_line2) details.address_line2 = "";
    for (const [name, value] of Object.entries(details)) {
      const el = form.elements.namedItem(name);
      if (!(el instanceof HTMLInputElement) || (!value && name !== "address_line2")) continue;
      el.value = value;
      el.classList.add("is-imported");
      el.addEventListener("input", () => el.classList.remove("is-imported"), { once: true });
    }
  }, [state, formRef]);

  return (
    <form action={action} className="mb-6 rounded-md border border-rule bg-paper p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="grow basis-64">
        <p className="font-semibold">Have a certificate you&rsquo;ve filed before?</p>
        <p className="text-sm text-muted">
          Upload it as a PDF or a photo and we&rsquo;ll fill in the details below for you to check. The file isn&rsquo;t kept.
        </p>
      </div>
      <label className={`btn btn-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${pending ? "opacity-55 cursor-progress" : ""}`}>
        {pending ? "Reading certificate…" : "Upload a past certificate"}
        <input
          ref={fileRef}
          type="file"
          name="certificate"
          accept="application/pdf,image/*"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            if (e.currentTarget.files?.length) e.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      {state?.error || state?.ok ? (
        <div className="w-full">
          <FormMessage state={state} />
        </div>
      ) : null}
    </form>
  );
}

/** Resizes large photos and converts formats like HEIC to JPEG so they upload quickly and can be read. */
async function prepareImage(file: File): Promise<File> {
  const readable = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (readable && file.size <= 1_500_000) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Image conversion failed");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
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
        <SubmitButton pending="Saving…">Save signing details</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

type DocumentItem = { id: string; label: string; file_name: string };

/** The workspace's documents: a list you can rename and remove, and a drop zone to add more. */
export function Documents({ docs }: { docs: DocumentItem[] }) {
  return (
    <>
      {docs.length ? (
        <ul className="divide-y divide-rule border-y border-rule mb-6">
          {docs.map((d) => (
            <DocumentRow key={d.id} doc={d} />
          ))}
        </ul>
      ) : null}
      <DocumentDropzone />
    </>
  );
}

function DocumentRow({ doc }: { doc: DocumentItem }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    setEditing(false);
    setError(undefined);
  };
  const save = (label: string) =>
    startTransition(async () => {
      const result = await renameDocument(doc.id, label);
      if (result?.error) setError(result.error);
      else cancel();
    });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2 grow"
          onSubmit={(e) => {
            e.preventDefault();
            save(String(new FormData(e.currentTarget).get("label") ?? ""));
          }}
        >
          <input
            name="label"
            defaultValue={doc.label}
            aria-label={`Name for ${doc.file_name}`}
            className="field !py-1.5 max-w-xs"
            maxLength={80}
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && cancel()}
          />
          <button className="btn btn-primary !py-1.5" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn btn-quiet !py-1.5" onClick={cancel}>
            Cancel
          </button>
          {error ? <p role="status" className="w-full text-sm text-alert">{error}</p> : null}
        </form>
      ) : (
        <>
          <div className="min-w-0">
            <p className="font-semibold">{doc.label}</p>
            <p className="text-sm text-muted truncate">{doc.file_name}</p>
          </div>
          <div className="ml-auto flex gap-4 text-sm">
            <button type="button" className="text-muted hover:text-ink" onClick={() => setEditing(true)}>
              Rename
            </button>
            <button
              type="button"
              className="text-muted hover:text-alert"
              disabled={pending}
              onClick={() => startTransition(() => deleteDocument(doc.id))}
            >
              {pending ? "Removing…" : "Remove"}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

/** Drop files, or click to browse. Each file uploads straight away, named from its file name. */
function DocumentDropzone() {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [results, setResults] = useState<{ error?: string; ok?: string }[]>([]);

  async function add(files: FileList) {
    const list = Array.from(files);
    const out: { error?: string; ok?: string }[] = [];
    for (const file of list) {
      if (!DOCUMENT_TYPES.includes(file.type)) {
        out.push({ error: `${file.name} isn't a PDF, PNG or JPG.` });
        continue;
      }
      if (file.size > DOCUMENT_MAX_BYTES) {
        out.push({ error: `${file.name} is over 2.5 MB. Keep documents small enough to fit in an email.` });
        continue;
      }
      setUploading(file.name);
      const fd = new FormData();
      fd.set("file", file);
      try {
        out.push((await uploadDocument(undefined, fd)) ?? {});
      } catch {
        out.push({ error: `Couldn't upload ${file.name}. Try again.` });
      }
    }
    setUploading(null);
    setResults(out.filter((r) => r.error || r.ok));
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!uploading && e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-1 rounded-md border border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${
          over ? "border-forest bg-forest-wash" : "border-control bg-paper hover:border-forest"
        } ${uploading ? "cursor-progress" : "cursor-pointer"}`}
      >
        <input
          ref={input}
          type="file"
          multiple
          accept={DOCUMENT_TYPES.join(",")}
          className="sr-only"
          disabled={Boolean(uploading)}
          onChange={(e) => {
            if (e.currentTarget.files?.length) add(e.currentTarget.files);
          }}
        />
        <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none mb-1 h-6 w-6 text-forest" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
        <span className="pointer-events-none font-semibold">
          {uploading ? (
            `Uploading ${uploading}…`
          ) : (
            <>
              Drop files here or <span className="text-forest underline underline-offset-2">browse</span>
            </>
          )}
        </span>
        <span className="pointer-events-none text-sm text-muted">
          PDF, PNG or JPG, up to 2.5 MB each. Each is named from its file name, and you can rename it.
        </span>
      </label>
      {results.length ? (
        <ul className="mt-2 grid gap-1">
          {results.map((r, i) => (
            <li key={i} role="status" className={`text-sm ${r.error ? "text-alert" : "text-forest"}`}>
              {r.error ?? r.ok}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
