import "server-only";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { z } from "zod";
import { has } from "@/lib/env";
import { structured } from "@/lib/llm";

/**
 * Reads a designer's existing paperwork and pulls out what goes on their
 * certificates. Two passes:
 *  1. A filled-in California resale certificate PDF (CDTFA-230 or the older
 *     BOE-230) has form fields; those are read exactly.
 *  2. Anything else (a scan, a photo, a seller's permit) is read by Claude.
 * Field values from pass 1 always win over pass 2.
 */

export const PROFILE_KEYS = [
  "business_name",
  "purchaser_name",
  "seller_permit",
  "business_type",
  "property_description",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "postal_code",
  "phone",
  "website",
] as const;
export const SIGNER_KEYS = ["printed_name", "title"] as const;

export type ExtractedProfile = Partial<Record<(typeof PROFILE_KEYS)[number] | (typeof SIGNER_KEYS)[number], string>>;
export type DocumentKind = "resale_certificate" | "sellers_permit" | "business_license" | "other";

export interface Extraction {
  kind: DocumentKind;
  values: ExtractedProfile;
}

const ExtractSchema = z.object({
  kind: z
    .enum(["resale_certificate", "sellers_permit", "business_license", "other"])
    .describe("What the document is. sellers_permit = a California seller's permit issued by CDTFA (or BOE)."),
  business_name: z.string().nullable().describe("The firm's trading name, e.g. the DBA ('Christine Costa Interiors'). Not the vendor."),
  purchaser_name: z
    .string()
    .nullable()
    .describe("The full 'Name of purchaser' line exactly as written on a resale certificate, including owner, LLC and DBA. Null if not a certificate."),
  seller_permit: z.string().nullable().describe("Seller's permit / account number, digits and dashes as printed."),
  business_type: z.string().nullable().describe("What the business sells (certificate paragraph 2), as written."),
  property_description: z.string().nullable().describe("What is bought for resale (certificate paragraph 5), as written."),
  address_line1: z.string().nullable(),
  address_line2: z.string().nullable().describe("Suite or unit, if any."),
  city: z.string().nullable(),
  state: z.string().nullable().describe("Two-letter state code."),
  postal_code: z.string().nullable(),
  phone: z.string().nullable().describe("Phone formatted like (310) 555-0100."),
  website: z.string().nullable(),
  printed_name: z.string().nullable().describe("The person who signed, from 'Printed name of person signing' or the permit holder."),
  title: z.string().nullable().describe("That person's title, e.g. 'Owner / Principal'."),
});

/** Field names used by the state's fillable PDFs, old and new versions. */
const FORM_FIELDS: Record<string, keyof ExtractedProfile | "area" | "tele"> = {
  question1: "seller_permit",
  question2: "business_type",
  question5: "property_description",
  nop: "purchaser_name",
  pnps: "printed_name",
  title: "title",
  adop: "address_line1",
  area: "area",
  tele: "tele",
  telephone: "tele",
};

async function readFormFields(bytes: Uint8Array): Promise<ExtractedProfile> {
  const out: ExtractedProfile = {};
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const raw: Record<string, string> = {};
    for (const field of pdf.getForm().getFields()) {
      if (!(field instanceof PDFTextField)) continue;
      const key = FORM_FIELDS[field.getName().toLowerCase()];
      const value = field.getText()?.trim();
      if (key && value) raw[key] = value;
    }
    for (const [k, v] of Object.entries(raw)) {
      if (k !== "area" && k !== "tele" && k !== "address_line1") out[k as keyof ExtractedProfile] = v;
    }
    if (raw.tele) out.phone = raw.area ? `(${raw.area}) ${raw.tele}` : raw.tele;
    // The certificate has one address line ("3704 Main St, Los Angeles CA 90001"); split it.
    if (raw.address_line1) Object.assign(out, splitAddress(raw.address_line1));
  } catch {
    // Not a fillable PDF, or unreadable: Claude handles it.
  }
  return out;
}

export function splitAddress(line: string): ExtractedProfile {
  const m = line.match(/^(.*?),\s*([^,]+?),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (!m) return { address_line1: line };
  const [, street, city, state, zip] = m;
  const unit = street.match(/^(.*?)(?:,\s*|\s+)((?:Suite|Ste\.?|Unit|Apt\.?|#)\s*\S+)$/i);
  return {
    address_line1: (unit ? unit[1] : street).trim(),
    ...(unit ? { address_line2: unit[2].trim() } : {}),
    city: city.trim(),
    state,
    postal_code: zip,
  };
}

export async function extractProfile(bytes: Uint8Array, mimeType: string): Promise<Extraction> {
  const fromForm = mimeType === "application/pdf" ? await readFormFields(bytes) : {};
  const formLooksLikeCertificate = Boolean(fromForm.seller_permit || fromForm.purchaser_name);

  let fromModel: ExtractedProfile = {};
  let kind: DocumentKind = formLooksLikeCertificate ? "resale_certificate" : "other";
  if (has("ANTHROPIC_API_KEY")) {
    try {
      const r = await structured({
        system:
          "You read an interior design firm's own paperwork (a resale certificate they filled in before, a California seller's permit, or a business license) and extract the firm's details. Copy values as printed. Use null for anything not on the document. Never guess a seller's permit number.",
        prompt: `Extract the firm's details from this document.${
          Object.keys(fromForm).length ? ` Its form fields already read: ${JSON.stringify(fromForm)}` : ""
        }`,
        schema: ExtractSchema,
        attachment: { bytes, mimeType },
        maxTokens: 1200,
      });
      kind = formLooksLikeCertificate ? "resale_certificate" : r.kind;
      const { kind: _k, ...rest } = r;
      void _k;
      fromModel = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v === "string" && v.trim())) as ExtractedProfile;
    } catch (err) {
      console.error("[extract] reading document failed:", err instanceof Error ? err.message : err);
    }
  }

  const values: ExtractedProfile = { ...fromModel, ...fromForm };
  // A certificate's purchaser line usually ends with the DBA, which is the best firm name.
  if (!values.business_name && values.purchaser_name) {
    const dba = values.purchaser_name.match(/DBA\s+(.+)$/i);
    values.business_name = (dba ? dba[1] : values.purchaser_name).trim();
  }
  if (values.state) values.state = values.state.toUpperCase().slice(0, 2);
  return { kind, values };
}

export const DOCUMENT_LABELS: Record<DocumentKind, string | null> = {
  resale_certificate: null, // an old certificate isn't something to attach to new filings
  sellers_permit: "Seller's permit",
  business_license: "Business license",
  other: null,
};
