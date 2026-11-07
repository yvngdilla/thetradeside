"use server";

import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type LoginState = { error?: string; sentTo?: string } | undefined;

export async function sendMagicLink(_: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter your email address." };

  if (env.signupMode() === "invite" && !env.bootstrapOwnerEmails().includes(email)) {
    const { data } = await createAdminClient().from("team_members").select("team_id").ilike("email", email).limit(1);
    if (!data?.length) {
      return { error: "This email hasn't been invited yet. Ask your workspace owner to add you in Settings." };
    }
  }

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${env.appUrl()}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { error: "Couldn't send the sign-in link. Wait a minute and try again." };
  return { sentTo: email };
}
