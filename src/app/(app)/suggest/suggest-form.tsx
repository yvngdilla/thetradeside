"use client";

import { useActionState, useEffect, useRef } from "react";
import { suggestFeature, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import { FEATURE_REQUEST_LIMITS } from "@/lib/feature-requests";

export function SuggestForm() {
  const [state, action] = useActionState<ActionState, FormData>(suggestFeature, undefined);
  const form = useRef<HTMLFormElement>(null);

  // Clear the form once a suggestion is saved, so the next one starts fresh.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action}>
      <label htmlFor="task" className="label">
        What task would you like handled?
      </label>
      <textarea
        id="task"
        name="task"
        required
        rows={4}
        maxLength={FEATURE_REQUEST_LIMITS.task}
        className="field"
        placeholder="Like: chasing vendors for tracking numbers and copying them into our project spreadsheet."
      />

      <label htmlFor="current_process" className="label mt-5">
        How do you handle it today? <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea
        id="current_process"
        name="current_process"
        rows={3}
        maxLength={FEATURE_REQUEST_LIMITS.currentProcess}
        className="field"
      />
      <p className="hint">The tools, the steps and how often it comes up. Anything that helps us picture it.</p>

      <label className="mt-5 flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="may_contact" defaultChecked className="mt-0.5 accent-[var(--forest)]" />
        <span>You can email me with questions about it</span>
      </label>

      <div className="mt-6">
        <SubmitButton pending="Sending…">Send suggestion</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
