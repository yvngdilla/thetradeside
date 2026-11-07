"use client";

import { useActionState, useState } from "react";
import { createWorkspace, type WelcomeState } from "./actions";
import { SubmitButton } from "@/components/ui";
import { FilePick } from "@/components/file-pick";

export function WelcomeForm() {
  const [state, action] = useActionState<WelcomeState, FormData>(createWorkspace, undefined);
  const [hasFile, setHasFile] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-6">
      <div>
        <label htmlFor="name" className="label">
          Firm name
        </label>
        <input id="name" name="name" required={!hasFile} className="field" placeholder="Studio name" />
        {hasFile ? <p className="hint">Leave blank to use the name on your document.</p> : null}
      </div>

      <div>
        <p className="label">Fill in your details from a document (optional)</p>
        <FilePick
          name="file"
          accept="application/pdf,image/png,image/jpeg"
          prompt="Upload a resale certificate you've filed before, or your seller's permit"
          detail="PDF or photo, up to 4 MB. We read your permit number, address and signer, and you check everything before filing."
          onChange={setHasFile}
        />
      </div>

      <SubmitButton pending={hasFile ? "Reading your document…" : "Creating…"}>Create workspace</SubmitButton>
      {state?.error ? <p className="text-sm text-alert">{state.error}</p> : null}
    </form>
  );
}
