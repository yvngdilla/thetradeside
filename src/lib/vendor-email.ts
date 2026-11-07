// The email that goes to a vendor with the certificate. Shared by the server
// (sending, Outlook drafts) and the filing panel, where the designer can edit
// the subject and message before it goes out.

import type { BusinessProfile, Signer, Vendor } from "@/lib/types";

export const VENDOR_EMAIL_LIMITS = { subject: 200, body: 5000 };

/** What the standard wording needs, small enough to hand to the browser. */
export interface VendorEmailParts {
  vendorName: string;
  businessName: string;
  emailNote: string;
  signature: string[];
}

export function vendorEmailParts(vendor: Vendor, profile: BusinessProfile, signer: Signer): VendorEmailParts {
  return {
    vendorName: vendor.display_name || vendor.seller_name || vendor.domain,
    businessName: profile.business_name,
    emailNote: profile.email_note,
    signature: [signer.printed_name, signer.title, profile.business_name, profile.phone, profile.website].filter(Boolean),
  };
}

/** The standard subject and message, mentioning whichever documents are attached. */
export function defaultVendorEmail(parts: VendorEmailParts, documentLabels: string[]): { subject: string; text: string } {
  const extras = documentLabels.length ? ` I've also included our ${joinList(documentLabels.map((l) => l.toLowerCase()))}.` : "";
  const paragraphs = [
    `Hello ${parts.vendorName} team,`,
    `Attached is the California resale certificate for ${parts.businessName}.${extras} Please keep it on file for our purchases and set us up with a trade account if we don't have one yet.`,
    parts.emailNote.trim(),
    "Let me know if you need anything else from us.",
    ["Thank you,", ...parts.signature].join("\n"),
  ].filter(Boolean);
  return { subject: `Resale certificate and trade account: ${parts.businessName}`, text: paragraphs.join("\n\n") };
}

/** Plain text to simple HTML: blank lines become paragraphs, single line breaks stay. */
export function vendorEmailHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
