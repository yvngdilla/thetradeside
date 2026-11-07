"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addVendor, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

export function AddVendorForm() {
  const [state, action] = useActionState<ActionState, FormData>(addVendor, undefined);
  return (
    <form action={action} className="mt-8 rounded-md border border-rule bg-sheet p-5">
      <label htmlFor="domain" className="label">
        Add a vendor
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="domain"
          name="domain"
          required
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          placeholder="Vendor website, like arteriorshome.com"
          className="field !text-base !py-2.5"
        />
        <SubmitButton pending="Adding…" className="btn btn-primary justify-center shrink-0">
          Add vendor
        </SubmitButton>
      </div>
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
