import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { download } from "@/lib/filing";
import { getWorkspace } from "@/lib/workspace";

export async function GET(_: NextRequest, ctx: RouteContext<"/api/filings/[id]/certificate">) {
  const { id } = await ctx.params;
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data: filing } = await supabase
    .from("filings")
    .select("certificate_path, vendors(display_name, domain)")
    .eq("id", id)
    .eq("team_id", ws.teamId)
    .single();
  if (!filing?.certificate_path) return NextResponse.json({ error: "No certificate for this filing" }, { status: 404 });

  const bytes = await download(filing.certificate_path);
  const vendor = filing.vendors as unknown as { display_name: string; domain: string } | null;
  const name = `Resale_Certificate_${(vendor?.display_name || vendor?.domain || "vendor").replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
