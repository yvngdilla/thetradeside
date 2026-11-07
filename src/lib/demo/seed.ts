// Sample data for demo mode. Every firm, person, vendor and address here is
// invented; vendor domains use the reserved .example suffix.

type Row = Record<string, unknown>;

export const DEMO_TEAM_ID = "00000000-0000-4000-8000-0000000000aa";
const USER_ID = "00000000-0000-4000-8000-000000000001";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// A tiny valid one-page PDF, standing in for an uploaded seller's permit copy.
const SAMPLE_PDF =
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";

export function seedDemo(
  tables: Record<string, Row[]>,
  putFile: (path: string, bytes: Uint8Array, contentType: string) => void,
  signature: Uint8Array,
) {
  const sigPath = `${DEMO_TEAM_ID}/signatures/${USER_ID}.png`;
  putFile(sigPath, signature, "image/png");
  const permitPath = `${DEMO_TEAM_ID}/documents/doc-permit/sellers-permit.pdf`;
  putFile(permitPath, new TextEncoder().encode(SAMPLE_PDF), "application/pdf");

  tables.teams = [{ id: DEMO_TEAM_ID, name: "Studio Lane", created_at: daysAgo(60) }];
  tables.team_members = [
    { team_id: DEMO_TEAM_ID, email: "jane@studiolane.example", user_id: USER_ID, role: "owner", invited_at: daysAgo(60), joined_at: daysAgo(60) },
    { team_id: DEMO_TEAM_ID, email: "alex@studiolane.example", user_id: null, role: "member", invited_at: daysAgo(2), joined_at: null },
  ];
  tables.business_profiles = [
    {
      team_id: DEMO_TEAM_ID,
      business_name: "Studio Lane",
      purchaser_name: "Jane Sample (Studio Lane, LLC) / DBA Studio Lane Interiors",
      seller_permit: "123-456789",
      business_type: "Furniture, accessories, surface materials, plumbing, fabric and wallcoverings",
      property_description: "Furniture and home accessories",
      address_line1: "100 Example Avenue",
      address_line2: "Suite 2",
      city: "Los Angeles",
      state: "CA",
      postal_code: "90001",
      phone: "(310) 555-0100",
      website: "studiolane.example",
      email_note: "",
    },
  ];
  tables.signers = [{ user_id: USER_ID, team_id: DEMO_TEAM_ID, printed_name: "Jane Sample", title: "Owner / Principal", signature_path: sigPath }];
  tables.team_documents = [
    {
      id: "doc-permit",
      team_id: DEMO_TEAM_ID,
      label: "Seller's permit",
      file_path: permitPath,
      file_name: "sellers-permit.pdf",
      mime_type: "application/pdf",
      size_bytes: SAMPLE_PDF.length,
      created_at: daysAgo(59),
    },
  ];
  tables.outlook_connections = [];

  const base = {
    team_id: DEMO_TEAM_ID, aliases: [], required_documents: [], property_description: null, discount_info: null,
    own_form_url: null, research_error: null, account_status: null, rep_name: null, rep_email: null, notes: null,
    created_by: USER_ID, filed_at: null, filed_by: null, trade_email: null, trade_url: null, application_url: null,
    research_sources: [],
  };

  tables.vendors = [
    {
      ...base,
      id: "v-marlow",
      domain: "marlowpierce.example",
      display_name: "Marlow & Pierce",
      seller_name: "Marlow & Pierce Upholstery, Inc.",
      status: "ready",
      method: "email",
      trade_email: "trade@marlowpierce.example",
      trade_url: "https://marlowpierce.example/to-the-trade",
      required_documents: ["California resale certificate", "Business card"],
      property_description: "Upholstered furniture",
      discount_info: "30% off retail for approved trade accounts",
      research_summary:
        "Marlow & Pierce takes resale certificates by email at their trade desk. Send the certificate and they'll open a trade account within two business days.",
      research_confidence: "high",
      research_sources: ["https://marlowpierce.example/to-the-trade"],
      created_at: daysAgo(1),
      updated_at: daysAgo(0.02),
    },
    {
      ...base,
      id: "v-sable",
      domain: "ateliersable.example",
      display_name: "Atelier Sable",
      seller_name: "Atelier Sable Rugs",
      status: "needs_review",
      method: "web_form",
      application_url: "https://ateliersable.example/trade/apply",
      trade_url: "https://ateliersable.example/trade",
      required_documents: ["California resale certificate", "Business license", "W-9"],
      property_description: "Rugs and textiles",
      research_summary:
        "Atelier Sable uses an online trade application with an upload for the resale certificate. The page also asks for a W-9, which isn't in your documents yet.",
      research_confidence: "medium",
      research_sources: ["https://ateliersable.example/trade", "https://ateliersable.example/trade/apply"],
      created_at: daysAgo(2),
      updated_at: daysAgo(0.1),
    },
    {
      ...base,
      id: "v-holloway",
      domain: "hollowaystone.example",
      display_name: "Holloway Stone",
      seller_name: "Holloway Stone & Tile Co.",
      status: "ready",
      method: "contact_rep",
      property_description: "Stone and tile",
      research_summary: "Holloway Stone sets up trade accounts through regional reps. The Los Angeles showroom lists a rep contact on their locations page.",
      research_confidence: "medium",
      rep_name: "Dana Ruiz",
      research_sources: ["https://hollowaystone.example/showrooms"],
      created_at: daysAgo(4),
      updated_at: daysAgo(0.5),
    },
    {
      ...base,
      id: "v-fernhill",
      domain: "fernhill-lighting.example",
      display_name: "Fernhill Lighting",
      seller_name: "Fernhill Lighting, LLC",
      status: "filed",
      method: "email",
      trade_email: "accounts@fernhill-lighting.example",
      property_description: "Lighting and home accessories",
      discount_info: "25% off list",
      account_status: "Approved, account #20418",
      research_summary: "Fernhill takes certificates by email at their accounts desk.",
      research_confidence: "high",
      created_at: daysAgo(21),
      updated_at: daysAgo(20),
      filed_at: daysAgo(20),
      filed_by: USER_ID,
    },
    {
      ...base,
      id: "v-ridgeway",
      domain: "ridgewaytextiles.example",
      display_name: "Ridgeway Textiles",
      seller_name: "Ridgeway Textiles Corp.",
      status: "filed",
      method: "portal_account",
      property_description: "Fabric and wallcoverings",
      account_status: "Approved",
      research_summary: "Ridgeway requires a trade account login before you can upload a certificate.",
      research_confidence: "high",
      created_at: daysAgo(48),
      updated_at: daysAgo(46),
      filed_at: daysAgo(46),
      filed_by: USER_ID,
    },
    {
      ...base,
      id: "v-corbel",
      domain: "corbelhardware.example",
      display_name: "corbelhardware.example",
      status: "failed",
      method: "unknown",
      research_error: "Couldn't read corbelhardware.example. Check the domain, or add the details by hand.",
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
    },
  ];

  tables.filings = [
    {
      id: "f-fernhill",
      team_id: DEMO_TEAM_ID,
      vendor_id: "v-fernhill",
      form_code: "CDTFA-230",
      method: "email",
      status: "sent",
      certificate_path: null,
      attached_document_ids: [],
      sent_to: "accounts@fernhill-lighting.example",
      steps: [{ at: daysAgo(20), text: "Emailed to accounts@fernhill-lighting.example, with a copy to jane@studiolane.example.", ok: true }],
      open_items: [],
      error: null,
      created_by: USER_ID,
      created_at: daysAgo(20),
      updated_at: daysAgo(20),
      completed_at: daysAgo(20),
    },
    {
      id: "f-ridgeway",
      team_id: DEMO_TEAM_ID,
      vendor_id: "v-ridgeway",
      form_code: "CDTFA-230",
      method: "portal",
      status: "submitted",
      certificate_path: null,
      attached_document_ids: [],
      sent_to: null,
      steps: [
        { at: daysAgo(46), text: "Signed certificate prepared", ok: true },
        { at: daysAgo(46), text: "Filled \"Company name\"", ok: true },
        { at: daysAgo(46), text: "Attached the certificate to \"Resale certificate\"", ok: true },
        { at: daysAgo(46), text: "You confirmed the application was submitted", ok: true },
      ],
      open_items: [],
      error: null,
      created_by: USER_ID,
      created_at: daysAgo(46),
      updated_at: daysAgo(46),
      completed_at: daysAgo(46),
    },
  ];
}
