"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { SubmitButton } from "@/components/ui";
import { Turnstile } from "@/components/turnstile";

export function LoginForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, undefined);

  if (state?.sentTo) {
    return (
      <div className="mt-8 border-l-2 border-forest pl-4">
        <p className="font-semibold">Check your email</p>
        <p className="text-muted mt-1">
          We sent a sign-in link to {state.sentTo}. It works once and expires in an hour.
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
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="you@yourstudio.com" defaultValue={state?.email} />
      </div>
      {turnstileSiteKey ? <Turnstile siteKey={turnstileSiteKey} resetKey={state?.attempt} /> : null}
      <SubmitButton pending="Sending link…">Email me a sign-in link</SubmitButton>
      {state?.error ? <p className="text-sm text-alert">{state.error}</p> : null}
    </form>
  );
}
