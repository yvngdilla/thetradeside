import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import type { BusinessProfile, Signer } from "@/lib/types";

export interface WorkspaceContext {
  userId: string;
  email: string;
  teamId: string;
  teamName: string;
  role: "owner" | "member";
}

/**
 * The signed-in user and their workspace, or why there isn't one. For callers
 * that answer with data (the browser extension), where a redirect is no use.
 */
export const findWorkspace = cache(async (): Promise<WorkspaceContext | "signed-out" | "no-workspace"> => {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return "signed-out";

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role, teams(name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return "no-workspace";

  const team = membership.teams as unknown as { name: string } | null;
  return {
    userId: user.id,
    email: user.email,
    teamId: membership.team_id,
    teamName: team?.name ?? "Workspace",
    role: membership.role as "owner" | "member",
  };
});

/**
 * Resolves the signed-in user and their workspace. Redirects to /login when
 * signed out and to /welcome when the user has no workspace yet.
 */
export const getWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const ws = await findWorkspace();
  if (ws === "signed-out") redirect("/login");
  if (ws === "no-workspace") redirect("/welcome");
  return ws;
});

/** Links pending invites (matched by email) to this user. Safe to call repeatedly. */
export async function claimInvites(userId: string, email: string) {
  const admin = createAdminClient();
  await admin
    .from("team_members")
    .update({ user_id: userId, joined_at: new Date().toISOString() })
    .ilike("email", email)
    .is("user_id", null);
}

export async function loadProfileAndSigner(ws: WorkspaceContext) {
  const supabase = await createUserClient();
  const [{ data: profile }, { data: signer }] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("team_id", ws.teamId).maybeSingle(),
    supabase.from("signers").select("*").eq("user_id", ws.userId).maybeSingle(),
  ]);
  return { profile: profile as BusinessProfile | null, signer: signer as Signer | null };
}
