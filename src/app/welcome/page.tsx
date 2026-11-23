import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { claimInvites } from "@/lib/workspace";
import { WelcomeForm } from "./welcome-form";
import { PaperShape } from "@/components/paper-shape";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function WelcomePage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  await claimInvites(user.id, user.email);
  const { data } = await supabase.from("team_members").select("team_id").eq("user_id", user.id).limit(1);
  if (data?.length) redirect("/");

  return (
    <main className="min-h-dvh overflow-hidden flex items-center justify-center px-6 py-12">
      <div className="relative w-full max-w-md">
        <PaperShape tone="sage" cut={1} className="-inset-x-[16%] -inset-y-[14%]" />
        <div className="relative sheet p-8 sm:p-9">
        <Wordmark />
        <h1 className="t-title mt-8">Set up your workspace</h1>
        <p className="text-muted mt-3">
          Your workspace holds your firm&rsquo;s certificate details and vendor list. You can invite your team once it&rsquo;s set up.
        </p>
        <WelcomeForm />
        </div>
      </div>
    </main>
  );
}
