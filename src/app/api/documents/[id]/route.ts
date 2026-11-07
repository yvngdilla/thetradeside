import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { download } from "@/lib/filing";
import { getWorkspace } from "@/lib/workspace";

/** Opens one of the workspace's saved documents. */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data: doc } = await supabase
    .from("team_documents")
    .select("file_path, file_name, mime_type")
    .eq("id", id)
    .eq("team_id", ws.teamId)
    .single();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const bytes = await download(doc.file_path);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${doc.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
