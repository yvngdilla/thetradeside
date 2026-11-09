import "server-only";
import { env } from "@/lib/env";

// Cloudflare Turnstile guards the sign-in form, the one form anyone on the
// internet can submit. Without it, scripts feed the form addresses that never
// asked for a sign-in link. The check is on only when both keys are set.

/** Name of the form field the Turnstile widget fills with its one-time token. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

export function turnstileEnabled(): boolean {
  return Boolean(env.turnstileSiteKey() && env.turnstileSecretKey());
}

/** True when Cloudflare confirms the token. Always true when the check is off. */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = env.turnstileSecretKey();
  if (!turnstileEnabled() || !secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
    });
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!json.success) console.warn("[sign-in] verification check failed:", json["error-codes"]?.join(", ") ?? "no reason given");
    return json.success === true;
  } catch (err) {
    // Fail closed: if Cloudflare can't be reached, no sign-in email goes out.
    console.error("[sign-in] verification check unreachable:", err instanceof Error ? err.message : err);
    return false;
  }
}
