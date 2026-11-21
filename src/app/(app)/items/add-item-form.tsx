"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addItem, type ActionState } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

export function AddItemForm({ projects }: { projects: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(addItem, undefined);
  return (
    <form action={action} className="mt-8 rounded-md border border-rule bg-sheet p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <label htmlFor="url" className="label">
            Add an item
          </label>
          <input
            id="url"
            name="url"
            required
            autoComplete="off"
            spellCheck={false}
            inputMode="url"
            placeholder="Link to the product page"
            className="field !text-base !py-2.5"
          />
        </div>
        <div>
          <label htmlFor="project" className="label">
            Project <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="project" name="project" list="project-names" autoComplete="off" placeholder="Client or job name" className="field !text-base !py-2.5" />
          <datalist id="project-names">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SubmitButton pending="Adding…" className="btn btn-primary justify-center shrink-0">
          Add item
        </SubmitButton>
        {state?.error ? (
          <p className="text-sm text-alert">{state.error}</p>
        ) : state?.ok ? (
          <p className="text-sm text-forest">
            {state.ok}. This takes under a minute.{" "}
            {state.itemId ? (
              <Link href={`/items/${state.itemId}`} className="underline underline-offset-4 font-semibold">
                Open it
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </form>
  );
}
