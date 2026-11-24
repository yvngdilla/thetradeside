import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { claimInvites } from "@/lib/workspace";
import { PaperShape } from "@/components/paper-shape";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Sign in" };

async function confirm(fd: FormData) {
  "use server";
  const tokenHash = String(fd.get("token_hash") ?? "");
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error || !data.user?.email) redirect("/login?error=link");
  await claimInvites(data.user.id, data.user.email);
  redirect("/");
}

export default async function ConfirmPage(props: PageProps<"/auth/confirm">) {
  const { token_hash } = await props.searchParams;
  if (typeof token_hash !== "string" || !token_hash) redirect("/login?error=link");

  return (
    <main className="min-h-dvh overflow-hidden flex items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-md">
      <PaperShape tone="sage" cut={1} className="-inset-x-[16%] -inset-y-[14%]" />
      <form action={confirm} className="relative sheet p-8 sm:p-9">
        <Wordmark />
        <h1 className="t-title mt-10">Sign in</h1>
        <p className="text-muted mt-3">Continue to your workspace.</p>
        <input type="hidden" name="token_hash" value={token_hash} />
        <button className="btn btn-primary mt-8">Continue</button>
      </form>
      </div>
    </main>
  );
}
