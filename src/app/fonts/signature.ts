import localFont from "next/font/local";

// Handwriting faces for typed signatures. Loaded only on the signature pad
// (preload off), so other pages don't pay for them.
// Mrs Saint Delafield and Allura: SIL Open Font License 1.1. Homemade Apple: Apache 2.0.
const delafield = localFont({ src: "./MrsSaintDelafield-Regular.woff2", weight: "400", display: "swap", preload: false });
const allura = localFont({ src: "./Allura-Regular.woff2", weight: "400", display: "swap", preload: false });
const homemade = localFont({ src: "./HomemadeApple-Regular.woff2", weight: "400", display: "swap", preload: false });

export interface SignatureStyle {
  id: string;
  label: string;
  className: string;
  fontFamily: string;
  /** Size that gives the faces a similar visual height. */
  size: number;
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
  { id: "flowing", label: "Flowing", className: delafield.className, fontFamily: delafield.style.fontFamily, size: 72 },
  { id: "classic", label: "Classic", className: allura.className, fontFamily: allura.style.fontFamily, size: 64 },
  { id: "handwritten", label: "Handwritten", className: homemade.className, fontFamily: homemade.style.fontFamily, size: 40 },
];
