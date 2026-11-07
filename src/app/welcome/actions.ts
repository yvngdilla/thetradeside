"use server";

import { redirect } from "next/navigation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type WelcomeState = { error?: string } | undefined;

/** Creates a workspace for a new firm. Allowed in open signup, or for bootstrap owners. */
export async function createWorkspace(_: WelcomeState, fd: FormData): Promise<WelcomeState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Enter your firm's name." };

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const email = user.email.toLowerCase();
  if (env.signupMode() !== "open" && !env.bootstrapOwnerEmails().includes(email)) {
    return { error: "New workspaces are invite-only right now." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("team_members").select("team_id").eq("user_id", user.id).limit(1);
  if (existing?.length) redirect("/");

  const { data: team, error } = await admin.from("teams").insert({ name }).select("id").single();
  if (error || !team) return { error: "Couldn't create the workspace. Try again." };
  await admin.from("team_members").insert({
    team_id: team.id,
    email,
    user_id: user.id,
    role: "owner",
    joined_at: new Date().toISOString(),
  });
  await admin.from("business_profiles").insert({ team_id: team.id, business_name: name });
  redirect("/settings?welcome=1");
}
