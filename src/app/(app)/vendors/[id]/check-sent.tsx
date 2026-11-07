"use client";

import { useActionState } from "react";
import { checkEmailSent, type ActionState } from "@/app/actions";
import { FormMessage, SubmitButton } from "@/components/ui";

export function CheckSentButton({ filingId }: { filingId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(() => checkEmailSent(filingId), undefined);
  return (
    <form action={action}>
      <SubmitButton className="btn btn-quiet" pending="Checking">
        I sent it
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
