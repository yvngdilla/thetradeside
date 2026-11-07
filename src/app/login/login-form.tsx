"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { SubmitButton } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, undefined);

  if (state?.sentTo) {
    return (
      <div className="mt-8 border-l-2 border-brass pl-4">
        <p className="font-semibold">Check your email</p>
        <p className="text-muted mt-1">
          We sent a sign-in link to {state.sentTo}. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="you@yourstudio.com" />
      </div>
      <SubmitButton pending="Sending link">Email me a sign-in link</SubmitButton>
      {state?.error ? <p className="text-sm text-oxblood">{state.error}</p> : null}
    </form>
  );
}
