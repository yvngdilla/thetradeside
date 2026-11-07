"use client";

import { useActionState } from "react";
import { createWorkspace, type WelcomeState } from "./actions";
import { SubmitButton } from "@/components/ui";

export function WelcomeForm() {
  const [state, action] = useActionState<WelcomeState, FormData>(createWorkspace, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Firm name
        </label>
        <input id="name" name="name" required className="field" placeholder="Studio name" />
      </div>
      <SubmitButton pending="Creating…">Create workspace</SubmitButton>
      {state?.error ? <p className="text-sm text-alert">{state.error}</p> : null}
    </form>
  );
}
