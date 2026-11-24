import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { itemsCsv } from "@/lib/item-export";
import type { Item, Project, Vendor } from "@/lib/types";

/** A project's items as a CSV file, rooms in the designer's order. */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/projects/[id]/csv">) {
  const { id } = await ctx.params;
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data: projectRow } = await supabase.from("projects").select("*").eq("id", id).eq("team_id", ws.teamId).maybeSingle();
  if (!projectRow) return NextResponse.json({ error: "No such project" }, { status: 404 });
  const project = projectRow as Project;

  const [{ data: itemRows }, { data: vendorRows }] = await Promise.all([
    supabase.from("items").select("*").eq("team_id", ws.teamId).eq("project_id", id),
    supabase.from("vendors").select("id, domain, display_name").eq("team_id", ws.teamId),
  ]);
  const csv = itemsCsv((itemRows ?? []) as Item[], (vendorRows ?? []) as Pick<Vendor, "id" | "domain" | "display_name">[], project.room_order ?? []);
  const name = `${project.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "project"}_items.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
