"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addVendor, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

export function AddVendorForm() {
  const [state, action] = useActionState<ActionState, FormData>(addVendor, undefined);
  const [typed, setTyped] = useState("");
  return (
    <form action={action} className="mt-6">
      <label htmlFor="domain" className="sr-only">
        Link to the vendor&rsquo;s website
      </label>
      <div className="flex gap-2">
        <input
          id="domain"
          name="domain"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste any page from their website"
          className="field !text-base !py-2.5"
          onChange={(e) => setTyped(e.target.value)}
        />
        <SubmitButton pending="Adding…">Add vendor</SubmitButton>
      </div>
      <PendingRow typed={typed} />
      {state?.error ? (
        <p className="text-sm mt-2 text-alert">
          {state.error}{" "}
          {state.vendorId ? (
            <Link href={`/vendors/${state.vendorId}`} className="underline underline-offset-4 font-semibold">
              Open it
            </Link>
          ) : null}
        </p>
      ) : state?.ok ? (
        <p className="text-sm mt-2 text-forest">
          {state.ok}. This takes about a minute.{" "}
          {state.vendorId ? (
            <Link href={`/vendors/${state.vendorId}`} className="underline underline-offset-4 font-semibold">
              Open it
            </Link>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}

/** Shows the vendor right away, with the lookup sweep, while the server adds it. */
function PendingRow({ typed }: { typed: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  const host = typed.trim().replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
  return (
    <div className="row-researching row-arrive mt-4 flex items-center gap-4 py-3 border-b border-rule" aria-live="polite">
      <p className="t-name truncate text-muted">{host || "New vendor"}</p>
      <span className="tag tag-research ml-auto">Adding</span>
    </div>
  );
}
