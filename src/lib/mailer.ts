import "server-only";
import { env } from "@/lib/env";
import { APP_NAME } from "@/lib/brand";
import { demoDb, isDemo } from "@/lib/demo/store";

// All email the product sends goes through Resend from the Trade Side domain, so
// no designer needs to connect a mailbox and nothing depends on one provider.

export interface MailAttachment {
  filename: string;
  bytes: Uint8Array;
  contentType?: string;
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromLocal?: string;
  replyTo?: string;
  cc?: string[];
  attachments?: MailAttachment[];
}

export async function sendMail(mail: Mail): Promise<{ id: string }> {
  if (isDemo()) {
    // Demo mode never sends: it records what would have gone out.
    demoDb().sentMail.push({ to: mail.to, subject: mail.subject, at: new Date().toISOString() });
    return { id: `demo-${Date.now()}` };
  }
  const from = `${mail.fromName ?? APP_NAME} <${mail.fromLocal ?? "hello"}@${env.emailDomain()}>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [mail.to],
      cc: mail.cc?.length ? mail.cc : undefined,
      reply_to: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.bytes).toString("base64"),
        content_type: a.contentType,
      })),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(`Email couldn't be sent: ${json.message ?? res.statusText}`);
  return { id: json.id };
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Simple, readable layout for the product's own emails (sign-in, invites). */
export function systemEmail(heading: string, paragraphs: string[], button?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${button.url}" style="background:#1f3a2e;color:#f6efe9;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1c1a;font-size:15px;line-height:1.55;max-width:520px">
<p style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#1f3a2e;margin:0 0 18px;border-bottom:2px solid #d48a74;display:inline-block;padding-bottom:2px">The ${escapeHtml(APP_NAME)}</p>
<h1 style="font-size:20px;margin:0 0 14px">${escapeHtml(heading)}</h1>${body}${cta}
</div>`;
}
