import { after, NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createUserClient } from "@/lib/supabase/server";
import { findWorkspace } from "@/lib/workspace";
import { createItem } from "@/lib/item-add";
import { runClipJob } from "@/lib/jobs/clip-job";
import { normalizeDomain } from "@/lib/domain";
import { ITEM_LIMITS } from "@/lib/items";
import { env } from "@/lib/env";

// The browser extension's one endpoint. GET says who is signed in and lists
// their projects. POST adds the page the designer has open as an item.
// It uses the designer's own Trade Side session, so every read and write is
// scoped to their workspace exactly as in the app.

export const maxDuration = 300;

/** Page source over this size is cut. Vercel refuses request bodies over 4.5 MB. */
const MAX_HTML_CHARS = 3_000_000;

/** Only the extension, or the app itself, may call this. Stops another website from adding items with a visitor's session. */
function allowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET";
  return origin.startsWith("chrome-extension://") || origin === env.appUrl() || origin === request.nextUrl.origin;
}

async function workspace() {
  const ws = await findWorkspace();
  if (ws === "signed-out") return { fail: NextResponse.json({ error: "Sign in to Trade Side first.", reason: "signed-out" }, { status: 401 }) };
  if (ws === "no-workspace") return { fail: NextResponse.json({ error: "Finish setting up your workspace in Trade Side first.", reason: "no-workspace" }, { status: 403 }) };
  return { ws };
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { ws, fail } = await workspace();
  if (!ws) return fail;
  const supabase = await createUserClient();
  const { data } = await supabase.from("projects").select("name").eq("team_id", ws.teamId).order("created_at", { ascending: false });
  return NextResponse.json({ workspace: ws.teamName, projects: ((data ?? []) as { name: string }[]).map((p) => p.name) }, { headers: { "Cache-Control": "private, no-store" } });
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { ws, fail } = await workspace();
  if (!ws) return fail;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Couldn't read that page. Try again." }, { status: 400 });
  }
  const url = text(body.url, ITEM_LIMITS.url);
  const project = text(body.project, 200);
  const html = typeof body.html === "string" ? body.html.slice(0, MAX_HTML_CHARS) : "";
  const selected = Array.isArray(body.selected) ? body.selected.map((v) => text(v, 120)).filter(Boolean).slice(0, 12) : [];

  // A pin: follow it to the page it came from. With no source, keep the pin's own title and photo.
  const pin = body.pin && typeof body.pin === "object" ? (body.pin as Record<string, unknown>) : null;
  const pinUrl = pin ? text(pin.url, ITEM_LIMITS.url) : "";
  const pinDetails = pin ? { name: text(pin.title, ITEM_LIMITS.text) || "Pin from Pinterest", image: /^https:\/\//.test(text(pin.image, ITEM_LIMITS.url)) ? text(pin.image, ITEM_LIMITS.url) : null } : null;
  const source = pin ? text(pin.source, ITEM_LIMITS.url) : "";
  const sourceIsPinterest = /(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/.test(normalizeDomain(source) ?? "");

  let item: Awaited<ReturnType<typeof createItem>>;
  let reads = true;
  if (pin && pinDetails) {
    if (!pinUrl) return NextResponse.json({ error: "Open a single pin, then try again." }, { status: 400 });
    const notes = `Found on Pinterest: ${pinUrl}`;
    if (source && !sourceIsPinterest) {
      item = await createItem(ws, { url: source, project, notes });
    } else {
      item = await createItem(ws, { url: pinUrl, project, notes, known: pinDetails });
      reads = false;
    }
  } else {
    item = await createItem(ws, { url, project });
  }
  if ("error" in item) return NextResponse.json({ error: item.error }, { status: 400 });

  const id = item.id;
  // A pin's source is read from the server. Any other page is read from the source the extension sent.
  if (reads) after(() => runClipJob(id, pin ? { fallback: pinDetails ?? undefined } : { html: html || undefined, selected }));
  revalidatePath("/items");
  return NextResponse.json({ id, link: `${request.nextUrl.origin}/items/${id}`, reading: reads });
}
