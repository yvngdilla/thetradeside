// Team documents (seller's permit, W-9, business license, ...) that go out with
// certificates. Names matter: they are listed in vendor emails and matched
// against the documents each vendor asks for.

export const DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export const DOCUMENT_MAX_BYTES = 2_500_000;

const KNOWN: [RegExp, string][] = [
  [/\bw[\s_-]?9\b/i, "W-9"],
  [/seller'?s?[\s_-]*permit|\bpermit\b/i, "Seller's permit"],
  [/resale/i, "Resale certificate"],
  [/business[\s_-]*licen[cs]e|\blicen[cs]e\b/i, "Business license"],
  [/\bcoi\b|insurance/i, "Certificate of insurance"],
  [/\basid\b/i, "ASID membership"],
  [/\biida\b/i, "IIDA membership"],
  [/\bein\b|\bcp[\s_-]?575\b|\b147c\b/i, "EIN letter"],
  [/articles|incorporation|\bllc\b.*(cert|filing)|statement[\s_-]*of[\s_-]*information/i, "Business registration"],
];

/** A readable document name from a file name: a known type, or the file name tidied up. */
export function documentLabelFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  for (const [pattern, label] of KNOWN) if (pattern.test(base)) return label;
  const words = base
    .replace(/[_\-.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!words || /^(img|image|scan|document|doc|file|photo|pxl|dsc)\s?\d*$/i.test(words)) return "Document";
  return words.charAt(0).toUpperCase() + words.slice(1);
}
