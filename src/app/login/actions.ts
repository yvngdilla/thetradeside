"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { sendMail, systemEmail } from "@/lib/mailer";
import { APP_NAME } from "@/lib/brand";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/demo/store";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";

export type LoginState = { error?: string; sentTo?: string; email?: string; attempt?: number } | undefined;

/**
 * Emails a one-time sign-in link. The link opens a confirm page with a button
 * (rather than signing in on page load), so mail scanners that pre-open links
 * can't use it up, and it works on any device.
 */
export async function sendMagicLink(prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (isDemo()) redirect("/");
  // Every failed attempt bumps `attempt`, which makes the form fetch a fresh
  // verification token (each token can be checked only once).
  const fail = (error: string): LoginState => ({ error, email, attempt: (prev?.attempt ?? 0) + 1 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter your email address.");

  // Before anything is created or sent: scripts that fill this form with other
  // people's addresses stop here.
  if (!(await verifyTurnstile(String(fd.get(TURNSTILE_FIELD) ?? "")))) {
    return fail("We couldn't confirm this request came from a person. Wait a few seconds and try again.");
  }

  const admin = createAdminClient();
  if (env.signupMode() === "invite" && !env.bootstrapOwnerEmails().includes(email)) {
    const { data } = await admin.from("team_members").select("team_id").ilike("email", email).limit(1);
    if (!data?.length) {
      return fail("This email hasn't been invited yet. Ask your workspace owner to add you in Settings.");
    }
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    console.error("[sign-in] generateLink failed:", error?.message ?? "no token returned");
    return fail("Couldn't create a sign-in link. Wait a minute and try again.");
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
  } catch (err) {
    console.error("[sign-in] email send failed:", err instanceof Error ? err.message : err);
    return fail("Couldn't send the sign-in email. Wait a minute and try again.");
  }
  return { sentTo: email };
}
