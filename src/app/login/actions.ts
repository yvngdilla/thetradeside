"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendMail, systemEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/store";

export type LoginState = { error?: string; sentTo?: string } | undefined;

/**
 * Emails a one-time sign-in link. The link opens a confirm page with a button
 * (rather than signing in on page load), so mail scanners that pre-open links
 * can't use it up, and it works on any device.
 */
export async function sendMagicLink(_: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (isDemo()) redirect("/");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter your email address." };

  const admin = createAdminClient();
  if (env.signupMode() === "invite" && !env.bootstrapOwnerEmails().includes(email)) {
    const { data } = await admin.from("team_members").select("team_id").ilike("email", email).limit(1);
    if (!data?.length) {
      return { error: "This email hasn't been invited yet. Ask your workspace owner to add you in Settings." };
    }
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    return { error: "Couldn't create a sign-in link. Wait a minute and try again." };
  }

  const url = `${env.appUrl()}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  try {
    await sendMail({
      to: email,
      fromLocal: "signin",
      subject: `Sign in to ${APP_NAME}`,
      html: systemEmail(
        `Sign in to ${APP_NAME}`,
        ["Use the button below to sign in. The link works once and expires in an hour.", "If you didn't ask for this, you can ignore this email."],
        { label: "Sign in", url },
      ),
      text: `Sign in to ${APP_NAME}: ${url}\n\nThe link works once and expires in an hour.`,
    });
  } catch {
    return { error: "Couldn't send the sign-in email. Wait a minute and try again." };
  }
  return { sentTo: email };
}
