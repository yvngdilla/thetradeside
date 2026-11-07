"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addVendor, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

export function AddVendorForm() {
  const [state, action] = useActionState<ActionState, FormData>(addVendor, undefined);
  return (
    <form action={action} className="mt-6">
      <label htmlFor="domain" className="sr-only">
        Vendor website
      </label>
      <div className="flex gap-2">
        <input
          id="domain"
          name="domain"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="vendor website, like arteriorshome.com"
          className="field !text-base !py-2.5"
        />
        <SubmitButton pending="Adding">Add vendor</SubmitButton>
      </div>
      {state?.error ? (
        <p className="text-sm mt-2 text-oxblood">
          {state.error}{" "}
          {state.vendorId ? (
            <Link href={`/vendors/${state.vendorId}`} className="underline underline-offset-4 font-semibold">
              Open it
            </Link>
          ) : null}
        </p>
      ) : state?.ok ? (
        <p className="text-sm mt-2 text-chip">
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
