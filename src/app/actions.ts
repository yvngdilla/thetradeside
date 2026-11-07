"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BUCKET, createAdminClient, createUserClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { normalizeDomain, startingPage } from "@/lib/domain";
import { runResearchJob } from "@/lib/jobs/research-job";
import { releaseBrowser, runPortalJob } from "@/lib/jobs/portal-job";
import { buildCertificate, certificateEmail, loadDocuments, loadFilingContext, markEmailSent, paths, upload, addStep } from "@/lib/filing";
import { createOutlookDraft, disconnectOutlook, findSentFiling } from "@/lib/outlook";
import { sendMail, systemEmail } from "@/lib/mailer";
import { DOCUMENT_LABELS, extractProfile, type ExtractedProfile } from "@/lib/extract-profile";
import { env } from "@/lib/env";
import { APP_NAME } from "@/lib/brand";

export type ActionState = { error?: string; ok?: string; vendorId?: string } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// Vendors ----------------------------------------------------------------------

export async function addVendor(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const pasted = str(fd, "domain");
  const domain = normalizeDomain(pasted);
  if (!domain) return { error: "Paste a link to the vendor's website, like arteriorshome.com." };
  // Keep the exact page they pasted (often the trade program page) as the lookup's first stop.
  const firstPage = startingPage(pasted);

  const supabase = await createUserClient();
  const { data: existing } = await supabase
    .from("vendors")
    .select("id, display_name, status, filed_at")
    .eq("team_id", ws.teamId)
    .or(`domain.eq.${domain},aliases.cs.{${domain}}`)
    .maybeSingle();
  if (existing) {
    const when = existing.filed_at ? ` on ${new Date(existing.filed_at).toLocaleDateString("en-US")}` : "";
    return {
      error: existing.status === "filed" ? `Already filed with ${existing.display_name || domain}${when}.` : `${existing.display_name || domain} is already in your list.`,
      vendorId: existing.id,
    };
  }

  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({ team_id: ws.teamId, domain, display_name: domain, created_by: ws.userId, trade_url: firstPage })
    .select("id")
    .single();
  if (error || !vendor) return { error: "Couldn't add that vendor. Try again." };

  after(() => runResearchJob(vendor.id));
  revalidatePath("/");
  return { ok: `Looking up ${domain}`, vendorId: vendor.id };
}

export async function rerunResearch(vendorId: string) {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data } = await supabase.from("vendors").update({ status: "researching" }).eq("id", vendorId).eq("team_id", ws.teamId).select("id");
  if (data?.length) after(() => runResearchJob(vendorId));
  revalidatePath(`/vendors/${vendorId}`);
}

export async function updateVendor(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const id = str(fd, "id");
  const nullable = (k: string) => str(fd, k) || null;
  const aliases = str(fd, "aliases")
    .split(/[,\s]+/)
    .map((a) => normalizeDomain(a))
    .filter((a): a is string => Boolean(a));

  const supabase = await createUserClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      display_name: str(fd, "display_name"),
      seller_name: str(fd, "seller_name"),
      method: str(fd, "method"),
      trade_email: nullable("trade_email"),
      application_url: nullable("application_url"),
      trade_url: nullable("trade_url"),
      property_description: nullable("property_description"),
      discount_info: nullable("discount_info"),
      account_status: nullable("account_status"),
      rep_name: nullable("rep_name"),
      rep_email: nullable("rep_email"),
      notes: nullable("notes"),
      aliases,
    })
    .eq("id", id)
    .eq("team_id", ws.teamId);
  if (error) return { error: "Couldn't save changes." };

  // Editing a vendor that needed review means a person has now checked it.
  await supabase.from("vendors").update({ status: "ready" }).eq("id", id).eq("status", "needs_review");
  revalidatePath(`/vendors/${id}`);
  return { ok: "Saved" };
}

export async function deleteVendor(vendorId: string) {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  await supabase.from("vendors").delete().eq("id", vendorId).eq("team_id", ws.teamId);
  revalidatePath("/");
  redirect("/");
}

// Filing -----------------------------------------------------------------------

async function newFiling(teamId: string, vendorId: string, userId: string, method: "email" | "portal" | "manual", documentIds: string[]) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("filings")
    .insert({ team_id: teamId, vendor_id: vendorId, method, created_by: userId, attached_document_ids: documentIds })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't start the filing.");
  return data.id as string;
}

/**
 * Emails the certificate to the vendor. By default it's sent from Trade Side's
 * address with the designer as reply-to and in copy, so it works with any email
 * provider. With delivery=outlook it becomes a draft in the designer's Outlook instead.
 */
export async function fileByEmail(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const vendorId = str(fd, "vendor_id");
  const to = str(fd, "to").toLowerCase();
  const note = str(fd, "note");
  const delivery = str(fd, "delivery") === "outlook" ? "outlook" : "send";
  const documentIds = fd.getAll("documents").map(String);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { error: "Enter the vendor's email address." };

  const admin = createAdminClient();
  let filingId: string | null = null;
  try {
    const ctx = await loadFilingContext(ws.teamId, ws.userId, vendorId);
    filingId = await newFiling(ws.teamId, vendorId, ws.userId, "email", documentIds);
    const cert = await buildCertificate(ctx, filingId);
    const docs = await loadDocuments(ws.teamId, documentIds);
    const { subject, html, text } = certificateEmail(ctx.vendor, ctx.profile, ctx.signer, docs.map((d) => d.label), note);
    const attachments = [
      { filename: cert.fileName, contentType: "application/pdf", bytes: cert.bytes },
      ...docs.map((d) => ({ filename: d.file_name, contentType: d.mime_type, bytes: d.bytes })),
    ];

    if (delivery === "outlook") {
      const draft = await createOutlookDraft({
        userId: ws.userId,
        filingId,
        to,
        subject,
        html,
        attachments: attachments.map((a) => ({ name: a.filename, contentType: a.contentType, bytes: a.bytes })),
      });
      await admin
        .from("filings")
        .update({ status: "draft_created", certificate_path: cert.path, form_code: cert.formCode, outlook_message_id: draft.id, outlook_web_link: draft.webLink, sent_to: to })
        .eq("id", filingId);
      await addStep(filingId, `Draft to ${to} saved in Outlook. Send it from Outlook when you're ready.`);
      await admin.from("vendors").update({ status: "in_progress", trade_email: to }).eq("id", vendorId);
      revalidatePath(`/vendors/${vendorId}`);
      return { ok: "Draft saved in Outlook" };
    }

    await sendMail({
      to,
      cc: [ws.email],
      replyTo: ws.email,
      fromName: `${ctx.profile.business_name} via ${APP_NAME}`,
      fromLocal: "certificates",
      subject,
      html,
      text,
      attachments,
    });
    const now = new Date().toISOString();
    await admin
      .from("filings")
      .update({ status: "sent", certificate_path: cert.path, form_code: cert.formCode, sent_to: to, completed_at: now })
      .eq("id", filingId);
    await addStep(filingId, `Emailed to ${to}, with a copy to ${ws.email}. Replies go to ${ws.email}.`);
    await admin.from("vendors").update({ status: "filed", filed_at: now, filed_by: ws.userId, trade_email: to }).eq("id", vendorId);
    revalidatePath(`/vendors/${vendorId}`);
    return { ok: `Sent to ${to}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (filingId) await admin.from("filings").update({ status: "failed", error: msg }).eq("id", filingId);
    revalidatePath(`/vendors/${vendorId}`);
    return { error: msg };
  }
}

export async function fileByPortal(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const vendorId = str(fd, "vendor_id");
  const documentIds = fd.getAll("documents").map(String);
  try {
    await loadFilingContext(ws.teamId, ws.userId, vendorId); // validates settings before starting a paid browser
    const filingId = await newFiling(ws.teamId, vendorId, ws.userId, "portal", documentIds);
    await createAdminClient().from("vendors").update({ status: "in_progress" }).eq("id", vendorId);
    after(() => runPortalJob(filingId, ws.userId));
    revalidatePath(`/vendors/${vendorId}`);
    return { ok: "Opening the vendor's application" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Downloadable certificate without filing it anywhere (for phone, in-person or rep submissions). */
export async function markFiledManually(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const vendorId = str(fd, "vendor_id");
  const note = str(fd, "note");
  const admin = createAdminClient();
  try {
    const ctx = await loadFilingContext(ws.teamId, ws.userId, vendorId);
    const filingId = await newFiling(ws.teamId, vendorId, ws.userId, "manual", []);
    const cert = await buildCertificate(ctx, filingId);
    const now = new Date().toISOString();
    await admin.from("filings").update({ status: "manual", certificate_path: cert.path, completed_at: now }).eq("id", filingId);
    await addStep(filingId, note ? `Marked as filed: ${note}` : "Marked as filed");
    await admin.from("vendors").update({ status: "filed", filed_at: now, filed_by: ws.userId }).eq("id", vendorId);
    revalidatePath(`/vendors/${vendorId}`);
    return { ok: "Marked as filed" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function ownFiling(filingId: string) {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data } = await supabase.from("filings").select("*").eq("id", filingId).eq("team_id", ws.teamId).single();
  if (!data) throw new Error("Filing not found.");
  return { ws, filing: data };
}

export async function confirmPortalSubmitted(filingId: string) {
  const { ws, filing } = await ownFiling(filingId);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("filings").update({ status: "submitted", completed_at: now }).eq("id", filingId);
  await addStep(filingId, "You confirmed the application was submitted");
  await admin.from("vendors").update({ status: "filed", filed_at: now, filed_by: ws.userId }).eq("id", filing.vendor_id);
  await releaseBrowser(filing.browser_session_id);
  revalidatePath(`/vendors/${filing.vendor_id}`);
}

export async function cancelFiling(filingId: string) {
  const { filing } = await ownFiling(filingId);
  const admin = createAdminClient();
  await admin.from("filings").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", filingId);
  await admin.from("vendors").update({ status: "ready" }).eq("id", filing.vendor_id).eq("status", "in_progress");
  await releaseBrowser(filing.browser_session_id);
  revalidatePath(`/vendors/${filing.vendor_id}`);
}

export async function checkEmailSent(filingId: string): Promise<ActionState> {
  const { filing } = await ownFiling(filingId);
  try {
    const sentAt = await findSentFiling(filing.created_by, filingId);
    if (!sentAt) return { error: "Not sent yet. Open the draft in Outlook and press Send." };
    await markEmailSent(filing.id, filing.vendor_id, filing.created_by, sentAt);
    revalidatePath(`/vendors/${filing.vendor_id}`);
    return { ok: "Sent" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// Settings ---------------------------------------------------------------------

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const fields = [
    "business_name", "purchaser_name", "seller_permit", "business_type", "property_description",
    "address_line1", "address_line2", "city", "state", "postal_code", "phone", "website", "email_note",
  ] as const;
  const row = Object.fromEntries(fields.map((f) => [f, str(fd, f)]));
  row.state = (row.state || "CA").toUpperCase();
  const { error } = await supabase.from("business_profiles").upsert({ team_id: ws.teamId, ...row });
  if (error) return { error: "Couldn't save business details." };
  revalidatePath("/settings");
  return { ok: "Business details saved" };
}

export async function saveSigner(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const dataUrl = str(fd, "signature");
  const update: Record<string, string> = {
    user_id: ws.userId,
    team_id: ws.teamId,
    printed_name: str(fd, "printed_name"),
    title: str(fd, "title"),
  };
  if (dataUrl.startsWith("data:image/png;base64,")) {
    const bytes = new Uint8Array(Buffer.from(dataUrl.split(",")[1], "base64"));
    if (bytes.byteLength > 500_000) return { error: "That signature image is too large." };
    const path = paths.signature(ws.teamId, ws.userId);
    await upload(path, bytes, "image/png");
    update.signature_path = path;
  }
  const supabase = await createUserClient();
  const { error } = await supabase.from("signers").upsert(update);
  if (error) return { error: "Couldn't save your signing details." };
  revalidatePath("/settings");
  return { ok: "Signing details saved" };
}

const ALLOWED_DOC_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_ATTACH_BYTES = 2_500_000; // keeps certificate emails under provider limits

/** Saves a document into one of the standard slots (or a named "other" one), replacing what was there. */
export async function uploadDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  const file = fd.get("file");
  const label = str(fd, "label");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (!label) return { error: "Give the document a name, like \"Insurance certificate\"." };
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return { error: "Upload a PDF, PNG or JPG." };
  if (file.size > MAX_ATTACH_BYTES) return { error: "That file is over 2.5 MB. Use a smaller scan so it fits in vendor emails." };
  const saved = await saveTeamDocument(ws, label, file.name, file.type, new Uint8Array(await file.arrayBuffer()));
  if (!saved) return { error: "Couldn't save the document." };
  revalidatePath("/settings");
  return { ok: `${label} saved` };
}

async function saveTeamDocument(ws: { teamId: string; userId: string }, label: string, fileName: string, mime: string, bytes: Uint8Array) {
  const supabase = await createUserClient();
  // One file per slot: replace any earlier upload with the same name.
  await supabase.from("team_documents").delete().eq("team_id", ws.teamId).eq("label", label);
  const id = crypto.randomUUID();
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const path = paths.document(ws.teamId, id, safeName);
  await upload(path, bytes, mime);
  const { error } = await supabase.from("team_documents").insert({
    id, team_id: ws.teamId, label, file_path: path, file_name: safeName, mime_type: mime, size_bytes: bytes.byteLength, created_by: ws.userId,
  });
  return !error;
}

export type ExtractState = { error?: string; values?: ExtractedProfile; savedAs?: string | null; fileName?: string } | undefined;

/**
 * Reads an uploaded resale certificate, seller's permit or business license and
 * returns what it found so the Settings form can fill in for her to check.
 * A permit or license is also saved to Documents, since vendors ask for those.
 */
export async function fillFromDocument(_: ExtractState, fd: FormData): Promise<ExtractState> {
  const ws = await getWorkspace();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return { error: "Upload a PDF, PNG or JPG." };
  if (file.size > 4_000_000) return { error: "That file is over 4 MB. Try a smaller scan or a PDF." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { kind, values } = await extractProfile(bytes, file.type);
  if (!Object.keys(values).length) {
    return { error: "We couldn't read any details from that file. Try a clearer scan, or fill them in below." };
  }
  const label = DOCUMENT_LABELS[kind];
  const kept = !!label && file.size <= MAX_ATTACH_BYTES && (await saveTeamDocument(ws, label, file.name, file.type, bytes));
  if (kept) revalidatePath("/settings");
  return { values, savedAs: kept ? label : null, fileName: file.name };
}

export async function deleteDocument(id: string) {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data: doc } = await supabase.from("team_documents").select("file_path").eq("id", id).eq("team_id", ws.teamId).maybeSingle();
  await supabase.from("team_documents").delete().eq("id", id).eq("team_id", ws.teamId);
  if (doc?.file_path) await createAdminClient().storage.from(BUCKET).remove([doc.file_path]);
  revalidatePath("/settings");
}

export async function inviteMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const ws = await getWorkspace();
  if (ws.role !== "owner") return { error: "Only workspace owners can invite people." };
  const email = str(fd, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter an email address." };
  const supabase = await createUserClient();
  const { error } = await supabase.from("team_members").insert({ team_id: ws.teamId, email, role: "member", invited_by: ws.userId });
  if (error) return { error: error.code === "23505" ? "That person is already in this workspace." : "Couldn't add that person." };
  revalidatePath("/settings");

  const url = `${env.appUrl()}/login`;
  try {
    await sendMail({
      to: email,
      replyTo: ws.email,
      subject: `You've been added to ${ws.teamName} on ${APP_NAME}`,
      html: systemEmail(
        `Join ${ws.teamName}`,
        [
          `${ws.email} added you to ${ws.teamName} on ${APP_NAME}, where the team files resale certificates and tracks vendor trade accounts.`,
          `Sign in with this email address (${email}). No password needed.`,
        ],
        { label: "Sign in", url },
      ),
      text: `${ws.email} added you to ${ws.teamName} on ${APP_NAME}. Sign in with ${email} at ${url}`,
    });
  } catch (err) {
    console.error("[invite] email send failed:", err instanceof Error ? err.message : err);
    return { ok: `${email} was added, but the invite email didn't send. Ask them to sign in at ${url}.` };
  }
  return { ok: `Invite sent to ${email}` };
}

export async function removeMember(email: string) {
  const ws = await getWorkspace();
  if (ws.role !== "owner" || email.toLowerCase() === ws.email.toLowerCase()) return;
  const supabase = await createUserClient();
  await supabase.from("team_members").delete().eq("team_id", ws.teamId).eq("email", email);
  revalidatePath("/settings");
}

export async function disconnectOutlookAction() {
  const ws = await getWorkspace();
  await disconnectOutlook(ws.userId);
  revalidatePath("/settings");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
