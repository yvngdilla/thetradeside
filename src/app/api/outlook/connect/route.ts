import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspace } from "@/lib/workspace";
import { outlookAuthorizeUrl } from "@/lib/outlook";
import { randomToken } from "@/lib/crypto";

export async function GET() {
  await getWorkspace();
  const state = randomToken();
  (await cookies()).set("outlook_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(outlookAuthorizeUrl(state));
}
