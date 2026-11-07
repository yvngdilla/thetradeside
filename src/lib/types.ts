export type VendorStatus = "researching" | "ready" | "needs_review" | "in_progress" | "filed" | "failed";
export type SubmissionMethod = "email" | "web_form" | "portal_account" | "contact_rep" | "unknown";
export type FilingStatus =
  | "preparing"
  | "draft_created"
  | "portal_running"
  | "awaiting_review"
  | "sent"
  | "submitted"
  | "manual"
  | "failed"
  | "cancelled";

export interface BusinessProfile {
  team_id: string;
  business_name: string;
  purchaser_name: string;
  seller_permit: string;
  business_type: string;
  property_description: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  website: string;
  email_note: string;
}

export interface Signer {
  user_id: string;
  team_id: string;
  printed_name: string;
  title: string;
  signature_path: string | null;
}

export interface Vendor {
  id: string;
  team_id: string;
  domain: string;
  aliases: string[];
  display_name: string;
  seller_name: string;
  status: VendorStatus;
  method: SubmissionMethod;
  trade_email: string | null;
  trade_url: string | null;
  application_url: string | null;
  required_documents: string[];
  property_description: string | null;
  discount_info: string | null;
  own_form_url: string | null;
  research_summary: string | null;
  research_confidence: "high" | "medium" | "low" | null;
  research_sources: string[];
  research_error: string | null;
  account_status: string | null;
  rep_name: string | null;
  rep_email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  filed_at: string | null;
  filed_by: string | null;
}

export interface FilingStep {
  at: string;
  text: string;
  ok: boolean;
}

export interface OpenItem {
  label: string;
  reason: string;
}

export interface Filing {
  id: string;
  team_id: string;
  vendor_id: string;
  form_code: string;
  method: "email" | "portal" | "manual";
  status: FilingStatus;
  certificate_path: string | null;
  attached_document_ids: string[];
  outlook_message_id: string | null;
  outlook_web_link: string | null;
  sent_to: string | null;
  browser_session_id: string | null;
  live_view_url: string | null;
  steps: FilingStep[];
  open_items: OpenItem[];
  error: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TeamDocument {
  id: string;
  team_id: string;
  label: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export function fullAddress(p: BusinessProfile): string {
  const line2 = p.address_line2 ? `, ${p.address_line2}` : "";
  return `${p.address_line1}${line2}, ${p.city}, ${p.state} ${p.postal_code}`.trim();
}

export function profileGaps(p: BusinessProfile | null, s: Signer | null): string[] {
  const gaps: string[] = [];
  if (!p?.business_name) gaps.push("firm name");
  if (!p?.purchaser_name) gaps.push("name of purchaser");
  if (!p?.seller_permit) gaps.push("seller's permit number");
  if (!p?.business_type) gaps.push("type of business");
  if (!p?.property_description) gaps.push("description of what you buy for resale");
  if (!p?.address_line1 || !p?.city || !p?.postal_code) gaps.push("business address");
  if (!p?.phone) gaps.push("phone number");
  if (!s?.printed_name) gaps.push("your printed name");
  if (!s?.title) gaps.push("your title");
  if (!s?.signature_path) gaps.push("your signature");
  return gaps;
}
