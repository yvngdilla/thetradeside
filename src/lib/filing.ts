import "server-only";
import { BUCKET, createAdminClient } from "@/lib/supabase/server";
import { certificateFileName, fillCertificate, formForState } from "@/lib/forms";
import type { BusinessProfile, Signer, TeamDocument, Vendor } from "@/lib/types";
import { profileGaps } from "@/lib/types";
import { defaultVendorEmail, vendorEmailHtml, vendorEmailParts } from "@/lib/vendor-email";

export const paths = {
  signature: (teamId: string, userId: string) => `${teamId}/signatures/${userId}.png`,
  certificate: (teamId: string, vendorId: string, filingId: string) => `${teamId}/certificates/${vendorId}/${filingId}.pdf`,
  document: (teamId: string, docId: string, fileName: string) => `${teamId}/documents/${docId}/${fileName}`,
};

export async function download(path: string): Promise<Uint8Array> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Couldn't load ${path.split("/").pop()}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function upload(path: string, bytes: Uint8Array, contentType: string) {
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Couldn't save file: ${error.message}`);
}

export async function loadFilingContext(teamId: string, userId: string, vendorId: string) {
  const admin = createAdminClient();
  const [{ data: vendor }, { data: profile }, { data: signer }] = await Promise.all([
    admin.from("vendors").select("*").eq("id", vendorId).eq("team_id", teamId).single(),
    admin.from("business_profiles").select("*").eq("team_id", teamId).maybeSingle(),
    admin.from("signers").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!vendor) throw new Error("Vendor not found.");
  const gaps = profileGaps(profile as BusinessProfile | null, signer as Signer | null);
  if (gaps.length) throw new Error(`Finish Settings before filing. Missing: ${gaps.join(", ")}.`);
  return { vendor: vendor as Vendor, profile: profile as BusinessProfile, signer: signer as Signer };
}

/** Builds the signed certificate for a vendor and stores it with the filing. */
export async function buildCertificate(
  ctx: { vendor: Vendor; profile: BusinessProfile; signer: Signer },
  filingId: string,
): Promise<{ path: string; bytes: Uint8Array; fileName: string; formCode: string }> {
  const form = formForState(ctx.profile.state);
  const signaturePng = await download(ctx.signer.signature_path!);
  const vendorName = ctx.vendor.seller_name || ctx.vendor.display_name || ctx.vendor.domain;
  const bytes = await fillCertificate(form.code, {
    profile: ctx.profile,
    signer: ctx.signer,
    vendorName,
    propertyDescription: ctx.vendor.property_description || ctx.profile.property_description,
    signaturePng,
    date: new Date(),
  });
  const path = paths.certificate(ctx.vendor.team_id, ctx.vendor.id, filingId);
  await upload(path, bytes, "application/pdf");
  return { path, bytes, fileName: certificateFileName(vendorName, ctx.profile), formCode: form.code };
}

export async function loadDocuments(teamId: string, ids: string[]): Promise<(TeamDocument & { bytes: Uint8Array })[]> {
  if (!ids.length) return [];
  const { data } = await createAdminClient().from("team_documents").select("*").eq("team_id", teamId).in("id", ids);
  return Promise.all(((data ?? []) as TeamDocument[]).map(async (d) => ({ ...d, bytes: await download(d.file_path) })));
}

/**
 * The email that goes to the vendor. Uses the subject and message the designer
 * edited in the filing panel when given, otherwise the standard wording.
 */
export function certificateEmail(
  vendor: Vendor,
  profile: BusinessProfile,
  signer: Signer,
  documentLabels: string[],
  edited?: { subject?: string; text?: string },
) {
  const standard = defaultVendorEmail(vendorEmailParts(vendor, profile, signer), documentLabels);
  const subject = edited?.subject?.trim() || standard.subject;
  const text = edited?.text?.trim() || standard.text;
  return { subject, html: vendorEmailHtml(text), text };
}

export async function addStep(filingId: string, text: string, ok = true) {
  const admin = createAdminClient();
  const { data } = await admin.from("filings").select("steps").eq("id", filingId).single();
  const steps = [...((data?.steps as unknown[]) ?? []), { at: new Date().toISOString(), text, ok }];
  await admin.from("filings").update({ steps }).eq("id", filingId);
}

/** Not a server action: only called after the server has confirmed the email in Outlook. */
export async function markEmailSent(filingId: string, vendorId: string, userId: string, sentAt: string) {
  const admin = createAdminClient();
  await admin.from("filings").update({ status: "sent", completed_at: sentAt }).eq("id", filingId);
  await addStep(filingId, "Email sent from Outlook");
  await admin.from("vendors").update({ status: "filed", filed_at: sentAt, filed_by: userId }).eq("id", vendorId);
}
