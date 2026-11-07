import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createUserClient } from "@/lib/supabase/server";
import { connectOutlook } from "@/lib/outlook";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const back = (q: string) => NextResponse.redirect(new URL(`/settings?${q}#email`, url.origin));

  const jar = await cookies();
  const expected = jar.get("outlook_state")?.value;
  jar.delete("outlook_state");
  if (!expected || url.searchParams.get("state") !== expected) return back("outlook=expired");
  if (url.searchParams.get("error")) return back("outlook=denied");

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));

  try {
    await connectOutlook(user.id, url.searchParams.get("code") ?? "");
    return back("outlook=connected");
  } catch {
    return back("outlook=failed");
  }
}
