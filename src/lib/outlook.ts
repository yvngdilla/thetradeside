import "server-only";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";

// Microsoft 365 / Outlook through Microsoft Graph. The app only creates drafts;
// a person always presses Send in Outlook.

const SCOPES = "offline_access openid email User.Read Mail.ReadWrite";
const GRAPH = "https://graph.microsoft.com/v1.0";
// Custom property stamped on each draft so the sent copy can be found later.
const FILING_PROP = "String {6f1c2d4e-8b5a-4c3e-9f7d-2a1b3c4d5e6f} Name ResaleFilingId";

const authBase = () => `https://login.microsoftonline.com/${env.microsoftTenant()}/oauth2/v2.0`;
export const outlookRedirectUri = () => `${env.appUrl()}/api/outlook/callback`;

export function outlookAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.microsoftClientId(),
    response_type: "code",
    redirect_uri: outlookRedirectUri(),
    response_mode: "query",
    scope: SCOPES,
    state,
    prompt: "select_account",
  });
  return `${authBase()}/authorize?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${authBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.microsoftClientId(),
      client_secret: env.microsoftClientSecret(),
      scope: SCOPES,
      ...body,
    }),
  });
  const json = (await res.json()) as TokenResponse;
  if (!res.ok || json.error) throw new Error(json.error_description ?? json.error ?? "Microsoft sign-in failed");
  return json;
}

export async function connectOutlook(userId: string, code: string): Promise<string> {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: outlookRedirectUri() });
  if (!tokens.refresh_token) throw new Error("Microsoft did not return a refresh token. Try connecting again.");
  const me = await graph<{ mail?: string; userPrincipalName: string }>(tokens.access_token, "GET", "/me?$select=mail,userPrincipalName");
  const email = me.mail ?? me.userPrincipalName;
  await createAdminClient()
    .from("outlook_connections")
    .upsert({
      user_id: userId,
      email,
      refresh_token_enc: encrypt(tokens.refresh_token),
      access_token_enc: encrypt(tokens.access_token),
      expires_at: new Date(Date.now() + (tokens.expires_in - 120) * 1000).toISOString(),
    });
  return email;
}

export async function getOutlookConnection(userId: string) {
  const { data } = await createAdminClient()
    .from("outlook_connections")
    .select("email, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function disconnectOutlook(userId: string) {
  await createAdminClient().from("outlook_connections").delete().eq("user_id", userId);
}

async function accessToken(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("outlook_connections").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Connect Outlook in Settings first.");
  if (data.access_token_enc && data.expires_at && new Date(data.expires_at) > new Date()) {
    return decrypt(data.access_token_enc);
  }
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: decrypt(data.refresh_token_enc) });
  await admin
    .from("outlook_connections")
    .update({
      refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : data.refresh_token_enc,
      access_token_enc: encrypt(tokens.access_token),
      expires_at: new Date(Date.now() + (tokens.expires_in - 120) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return tokens.access_token;
}

async function graph<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) throw Object.assign(new Error("Not found in Outlook"), { status: 404 });
  const json = res.status === 204 ? ({} as T) : ((await res.json()) as T & { error?: { message: string } });
  if (!res.ok) {
    const msg = (json as { error?: { message: string } }).error?.message ?? res.statusText;
    throw new Error(`Outlook: ${msg}`);
  }
  return json as T;
}

export interface DraftAttachment {
  name: string;
  contentType: string;
  bytes: Uint8Array;
}

// Graph accepts inline attachments up to about 3 MB per request.
const MAX_INLINE_BYTES = 3 * 1024 * 1024;

export async function createOutlookDraft(opts: {
  userId: string;
  filingId: string;
  to: string;
  subject: string;
  html: string;
  attachments: DraftAttachment[];
}): Promise<{ id: string; webLink: string }> {
  const total = opts.attachments.reduce((n, a) => n + a.bytes.byteLength, 0);
  if (total > MAX_INLINE_BYTES) {
    throw new Error("The attachments are larger than 3 MB. Remove a document or use a smaller file.");
  }
  const token = await accessToken(opts.userId);
  const draft = await graph<{ id: string; webLink: string }>(token, "POST", "/me/messages", {
    subject: opts.subject,
    body: { contentType: "HTML", content: opts.html },
    toRecipients: [{ emailAddress: { address: opts.to } }],
    attachments: opts.attachments.map((a) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType,
      contentBytes: Buffer.from(a.bytes).toString("base64"),
    })),
    singleValueExtendedProperties: [{ id: FILING_PROP, value: opts.filingId }],
  });
  return { id: draft.id, webLink: draft.webLink };
}

/** Returns when the draft for this filing was sent, or null if it hasn't been. */
export async function findSentFiling(userId: string, filingId: string): Promise<string | null> {
  const token = await accessToken(userId);
  const filter = `singleValueExtendedProperties/Any(ep: ep/id eq '${FILING_PROP}' and ep/value eq '${filingId}')`;
  const res = await graph<{ value: { id: string; sentDateTime: string }[] }>(
    token,
    "GET",
    `/me/mailFolders('sentitems')/messages?$filter=${encodeURIComponent(filter)}&$select=id,sentDateTime&$top=1`,
  );
  return res.value[0]?.sentDateTime ?? null;
}
