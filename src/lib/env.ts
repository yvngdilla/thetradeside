// Central place for configuration. Server-only values throw a clear error when
// a feature that needs them is used without them being set.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See README.md for setup.`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  // Accepts both Supabase's newer key names and the ones the Vercel integration sets.
  supabasePublishableKey: () => supabasePublicKey() ?? required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: () => process.env.SUPABASE_SECRET_KEY ?? required("SUPABASE_SERVICE_ROLE_KEY"),
  appUrl: () =>
    (
      process.env.APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
    ).replace(/\/$/, ""),
  encryptionKey: () => required("TOKEN_ENCRYPTION_KEY"),

  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),
  anthropicModel: () => process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  firecrawlApiKey: () => required("FIRECRAWL_API_KEY"),

  microsoftClientId: () => required("MICROSOFT_CLIENT_ID"),
  microsoftClientSecret: () => required("MICROSOFT_CLIENT_SECRET"),
  microsoftTenant: () => process.env.MICROSOFT_TENANT ?? "common",

  browserbaseApiKey: () => required("BROWSERBASE_API_KEY"),
  browserbaseProjectId: () => required("BROWSERBASE_PROJECT_ID"),
  stagehandModel: () => process.env.STAGEHAND_MODEL ?? "anthropic/claude-sonnet-5-5",

  cronSecret: () => required("CRON_SECRET"),

  // Email (sign-in links, invites, certificates) is sent through Resend from this domain.
  resendApiKey: () => required("RESEND_API_KEY"),
  emailDomain: () => process.env.EMAIL_DOMAIN ?? "thetradeside.com",
  // Where new feature suggestions are emailed. Optional: they're saved either way.
  feedbackEmail: () => process.env.FEEDBACK_EMAIL || null,

  // Who may create a new workspace. "open" (default) lets any firm sign up;
  // "invite" only lets in invited emails and BOOTSTRAP_OWNER_EMAILS.
  signupMode: (): "open" | "invite" => (process.env.SIGNUP_MODE === "invite" ? "invite" : "open"),
  bootstrapOwnerEmails: () =>
    (process.env.BOOTSTRAP_OWNER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
};

/** Referenced literally so Next.js inlines it in the browser and proxy bundles. */
export function supabasePublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function has(name: string): boolean {
  // Demo mode shows the online-form option with a simulated run.
  if (name === "BROWSERBASE_API_KEY" && process.env.VERCEL_ENV !== "production" && (process.env.DEMO_MODE === "1" || process.env.VERCEL_GIT_COMMIT_REF === "demo")) return true;
  return Boolean(process.env[name]);
}
