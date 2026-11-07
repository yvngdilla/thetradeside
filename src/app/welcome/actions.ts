"use server";

import { redirect } from "next/navigation";
import { createAdminClient, createUserClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { DOCUMENT_LABELS, extractProfile, PROFILE_KEYS } from "@/lib/extract-profile";
import { paths, upload } from "@/lib/filing";

export type WelcomeState = { error?: string } | undefined;

/** Creates a workspace for a new firm. Allowed in open signup, or for bootstrap owners. */
export async function createWorkspace(_: WelcomeState, fd: FormData): Promise<WelcomeState> {
  let name = String(fd.get("name") ?? "").trim();
  const file = fd.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && !["application/pdf", "image/png", "image/jpeg"].includes(file.type)) return { error: "Upload a PDF, PNG or JPG." };
  if (hasFile && file.size > 4_000_000) return { error: "That file is over 4 MB. Try a smaller scan or a PDF." };

  // Read the document first so a missing firm name can come from it.
  const bytes = hasFile ? new Uint8Array(await file.arrayBuffer()) : null;
  const extraction = bytes ? await extractProfile(bytes, (file as File).type) : null;
  const found = extraction?.values ?? {};
  if (!name && found.business_name) name = found.business_name;
  if (!name) return { error: hasFile ? "We couldn't find a firm name in that file. Enter it above." : "Enter your firm's name." };

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
  const profile: Record<string, string> = { team_id: team.id, business_name: name };
  for (const key of PROFILE_KEYS) if (found[key] && key !== "business_name") profile[key] = found[key]!;
  await admin.from("business_profiles").insert(profile);
  if (found.printed_name || found.title) {
    await admin.from("signers").insert({ user_id: user.id, team_id: team.id, printed_name: found.printed_name ?? "", title: found.title ?? "" });
  }

  // Keep a seller's permit or business license: vendors often ask for a copy.
  const label = extraction ? DOCUMENT_LABELS[extraction.kind] : null;
  if (label && bytes && bytes.byteLength <= 2_500_000) {
    const id = crypto.randomUUID();
    const safeName = (file as File).name.replace(/[^\w.\-]+/g, "_");
    const path = paths.document(team.id, id, safeName);
    await upload(path, bytes, (file as File).type);
    await admin.from("team_documents").insert({
      id, team_id: team.id, label, file_path: path, file_name: safeName, mime_type: (file as File).type, size_bytes: bytes.byteLength, created_by: user.id,
    });
  }

  const filled = Object.keys(found).length;
  redirect(`/settings?welcome=1${filled ? `&filled=${filled}` : ""}`);
}
