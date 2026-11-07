import "server-only";
import { CDTFA_230_BASE64 } from "./cdtfa-230";
import { PDFDocument, StandardFonts, TextAlignment } from "pdf-lib";
import type { BusinessProfile, Signer } from "@/lib/types";
import { fullAddress } from "@/lib/types";

/**
 * Registry of state resale certificate forms. Each entry knows its official PDF
 * template, which AcroForm field holds which value, and where to stamp the
 * signature. Adding a state means adding an entry here.
 */
export interface CertificateInput {
  profile: BusinessProfile;
  signer: Signer;
  vendorName: string;
  propertyDescription: string;
  signaturePng: Uint8Array;
  date: Date;
}

interface FormDefinition {
  code: string;
  state: string;
  title: string;
  /** Official blank PDF. */
  template: () => Uint8Array;
  fill: (form: ReturnType<PDFDocument["getForm"]>, input: CertificateInput) => void;
  /** Field names to drop before flattening (print/clear buttons). */
  removeFields: string[];
  /** Box the signature image is scaled into, in PDF points (origin bottom-left). */
  signatureBox: { x: number; y: number; width: number; height: number };
}

function splitPhone(phone: string): { area: string; number: string } {
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length === 10) return { area: digits.slice(0, 3), number: `${digits.slice(3, 6)}-${digits.slice(6)}` };
  return { area: "", number: phone };
}

export function formatDate(d: Date, timeZone = "America/Los_Angeles"): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "2-digit", day: "2-digit", year: "numeric" }).format(d);
}

const CA_230: FormDefinition = {
  code: "CDTFA-230",
  state: "CA",
  title: "California General Resale Certificate (CDTFA-230)",
  template: () => new Uint8Array(Buffer.from(CDTFA_230_BASE64, "base64")),
  removeFields: ["print230", "clear230"],
  // Between the "Name of purchaser" field (top at y=170) and the
  // "Printed name of person signing" field (top at y=141).
  signatureBox: { x: 62, y: 142, width: 290, height: 21 },
  fill(form, { profile, signer, vendorName, propertyDescription, date }) {
    const phone = splitPhone(profile.phone);
    const set = (name: string, value: string) => form.getTextField(name).setText(value);
    set("question1", profile.seller_permit);
    set("question2", profile.business_type);
    set("question3", vendorName);
    set("question5", propertyDescription);
    set("nop", profile.purchaser_name || profile.business_name);
    set("pnps", signer.printed_name);
    set("TITLE", signer.title);
    set("adop", fullAddress(profile));
    set("area", phone.area);
    form.getTextField("area").setAlignment(TextAlignment.Center);
    set("telephone", phone.number);
    set("DATE", formatDate(date));
  },
};

export const FORMS: Record<string, FormDefinition> = { [CA_230.code]: CA_230 };

export function formForState(state: string): FormDefinition {
  // Only California is supported today. Vendors in other states generally accept
  // the purchaser's home-state certificate for drop-shipped resale purchases.
  void state;
  return CA_230;
}

export async function fillCertificate(code: string, input: CertificateInput): Promise<Uint8Array> {
  const def = FORMS[code];
  if (!def) throw new Error(`Unknown form ${code}`);

  const template = def.template();
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();

  def.fill(form, input);
  for (const name of def.removeFields) {
    const field = form.getFieldMaybe(name);
    if (field) form.removeField(field);
  }

  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helvetica);
  form.flatten();

  const page = pdf.getPage(0);
  const sig = await pdf.embedPng(input.signaturePng);
  const box = def.signatureBox;
  const scale = Math.min(box.width / sig.width, box.height / sig.height);
  page.drawImage(sig, { x: box.x, y: box.y, width: sig.width * scale, height: sig.height * scale });

  pdf.setTitle(`Resale certificate for ${input.vendorName}`);
  pdf.setAuthor(input.profile.purchaser_name || input.profile.business_name);
  pdf.setProducer("ResaleForm");
  return pdf.save();
}

export function certificateFileName(vendorName: string, profile: BusinessProfile): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `Resale_Certificate_${clean(profile.business_name || "Purchaser")}_${clean(vendorName)}.pdf`;
}
