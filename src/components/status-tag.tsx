import type { VendorStatus } from "@/lib/types";

const LABELS: Record<VendorStatus, { text: string; cls: string }> = {
  researching: { text: "Looking up", cls: "tag-research" },
  ready: { text: "Ready to file", cls: "tag-ready" },
  needs_review: { text: "Check details", cls: "tag-review" },
  in_progress: { text: "In progress", cls: "tag-progress" },
  filed: { text: "Filed", cls: "tag-filed" },
  failed: { text: "Couldn't look up", cls: "tag-failed" },
};

export function StatusTag({ status }: { status: VendorStatus }) {
  const { text, cls } = LABELS[status];
  return <span className={`tag ${cls}`}>{text}</span>;
}

export const METHOD_LABELS: Record<string, string> = {
  email: "Email",
  web_form: "Online form",
  portal_account: "Account sign-up",
  contact_rep: "Through a rep",
  unknown: "Not found",
};
