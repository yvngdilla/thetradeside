import { readFile, writeFile } from "node:fs/promises";
import { fillCertificate } from "../src/lib/forms/index";

const [sigPath, outPath] = process.argv.slice(2);
const sig = new Uint8Array(await readFile(sigPath));
const pdf = await fillCertificate("CDTFA-230", {
  profile: {
    team_id: "t", business_name: "Sample Studio", purchaser_name: "Jane Sample (Sample Studio, LLC) / DBA Sample Interiors",
    seller_permit: "123-456789", business_type: "Furniture, accessories, surface materials, plumbing, fabric and wallcoverings",
    property_description: "Furniture and home accessories", address_line1: "100 Example Ave", address_line2: "Suite 2",
    city: "Los Angeles", state: "CA", postal_code: "90001", phone: "(310) 555-0100", website: "", email_note: "",
  },
  signer: { user_id: "u", team_id: "t", printed_name: "Jane Sample", title: "Owner / Principal", signature_path: "x" },
  vendorName: "Example Furniture Co.",
  propertyDescription: "Lighting, furniture and home accessories",
  signaturePng: sig,
  date: new Date("2026-11-06T20:00:00Z"),
});
await writeFile(outPath, pdf);
console.log("wrote", pdf.length, "bytes");
