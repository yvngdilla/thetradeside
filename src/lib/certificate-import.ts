import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { z } from "zod";
import { structured } from "@/lib/llm";
import type { BusinessProfile } from "@/lib/types";

/**
 * Reads a resale certificate the designer filed before (a PDF, scan or photo)
 * and pulls out the purchaser's details so the certificate details form can be
 * filled in for them to check. The file is read once and never stored.
 */

export const IMPORT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];
/** Server actions accept 3 MB; images are resized in the browser before upload. */
export const IMPORT_MAX_BYTES = 2_500_000;

export type ImportedField = Exclude<keyof BusinessProfile, "team_id" | "email_note">;
export type ImportedDetails = Partial<Record<ImportedField, string>>;

const text = (description: string) => z.string().nullable().describe(description);

const CertificateDetailsSchema = z.object({
  is_certificate: z
    .boolean()
    .describe("True if the document is a resale certificate or sales tax exemption certificate (any state or a multistate form)."),
  business_name: text("The purchaser's firm or trading name, e.g. 'Doe Interiors'. Prefer the DBA or company name over a person's name."),
  purchaser_name: text(
    "The 'Name of purchaser' line exactly as written, including any entity and DBA, e.g. 'Jane Doe (Doe Design, LLC) / DBA Doe Interiors'.",
  ),
  seller_permit: text("The purchaser's seller's permit or resale number (California: paragraph 1). Copy it exactly, including dashes."),
  business_type: text("What the purchaser's business sells (California: paragraph 2, 'I am engaged in the business of selling ...')."),
  property_description: text("The property bought for resale (California: paragraph 5, 'Description of property to be purchased for resale')."),
  address_line1: text("Purchaser's street address, without suite or unit."),
  address_line2: text("Suite, unit or floor of the purchaser's address, if any."),
  city: text("Purchaser's city."),
  state: text("Purchaser's state as a two-letter code, e.g. 'CA'."),
  postal_code: text("Purchaser's ZIP code."),
  phone: text("Purchaser's telephone number including area code, e.g. '(310) 555-0142'."),
  website: text("Purchaser's website, only if printed on the document."),
});

const SYSTEM = [
  "You read resale certificates that an interior design firm filed with its vendors, and copy out the purchaser's details.",
  "The purchaser is the design firm that signed the certificate. The seller (the vendor the certificate was issued to, on the 'purchase from' or 'seller' line) is someone else: never return the seller's name, permit number or address.",
  "Copy values exactly as written, keeping capitalisation and punctuation. Read handwriting carefully.",
  "If a value is not on the document or you cannot read it with confidence, return null. Never guess or fill in a likely value.",
].join(" ");

/** Values already typed into a fillable PDF's form fields, which some readers miss. */
async function pdfFormValues(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const lines = pdf
      .getForm()
      .getFields()
      .filter((f): f is PDFTextField => f instanceof PDFTextField)
      .map((f) => [f.getName(), f.getText()?.trim()] as const)
      .filter(([, value]) => Boolean(value))
      .map(([name, value]) => `${name}: ${value}`);
    return lines.join("\n").slice(0, 4000);
  } catch {
    return "";
  }
}

export async function readCertificateDetails(file: { bytes: Uint8Array; type: ImportType }): Promise<ImportedDetails | null> {
  const data = Buffer.from(file.bytes).toString("base64");
  const fileBlock: Anthropic.ContentBlockParam =
    file.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.type, data } };

  const formValues = file.type === "application/pdf" ? await pdfFormValues(file.bytes) : "";
  const instructions = [
    "Copy the purchaser's details from this certificate.",
    formValues ? `The PDF's form fields contain these values, which may not show in the page text:\n${formValues}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await structured({
    system: SYSTEM,
    prompt: [fileBlock, { type: "text", text: instructions }],
    schema: CertificateDetailsSchema,
    maxTokens: 1500,
  });
  if (!result.is_certificate) return null;

  const details: ImportedDetails = {};
  for (const [key, value] of Object.entries(result) as [keyof typeof result, unknown][]) {
    if (key === "is_certificate" || typeof value !== "string") continue;
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean) details[key as ImportedField] = clean;
  }
  if (details.state) {
    const code = details.state.toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) details.state = code;
    else delete details.state;
  }
  return details;
}
