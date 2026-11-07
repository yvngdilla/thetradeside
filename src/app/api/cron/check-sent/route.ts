import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { findSentFiling } from "@/lib/outlook";
import { markEmailSent } from "@/lib/filing";

// Runs on a schedule (vercel.json). Marks Outlook drafts as filed once they've been sent.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: drafts } = await admin
    .from("filings")
    .select("id, vendor_id, created_by")
    .eq("status", "draft_created")
    .gte("created_at", since)
    .limit(200);

  let sent = 0;
  for (const f of drafts ?? []) {
    try {
      const at = await findSentFiling(f.created_by, f.id);
      if (at) {
        await markEmailSent(f.id, f.vendor_id, f.created_by, at);
        sent++;
      }
    } catch {
      // Disconnected mailbox or expired consent: leave it for the person to check by hand.
    }
  }
  return NextResponse.json({ checked: drafts?.length ?? 0, sent });
}
