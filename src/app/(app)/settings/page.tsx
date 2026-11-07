import type { Metadata } from "next";
import { BUCKET, createAdminClient, createUserClient } from "@/lib/supabase/server";
import { getWorkspace, loadProfileAndSigner } from "@/lib/workspace";
import { getOutlookConnection } from "@/lib/outlook";
import { has } from "@/lib/env";
import type { TeamDocument } from "@/lib/types";
import { disconnectOutlookAction, removeMember } from "@/app/actions";
import { Documents, InviteForm, ProfileForm, SignerForm } from "./forms";

export const metadata: Metadata = { title: "Settings" };

const OUTLOOK_MESSAGES: Record<string, string> = {
  connected: "Outlook is connected.",
  denied: "Outlook wasn't connected. Permission was declined.",
  expired: "That took too long. Connect Outlook again.",
  failed: "Outlook couldn't be connected. If your company manages your Microsoft account, your IT admin may need to approve the app.",
};

export default async function SettingsPage(props: PageProps<"/settings">) {
  const ws = await getWorkspace();
  const sp = await props.searchParams;
  const supabase = await createUserClient();
  const [{ profile, signer }, { data: docs }, { data: members }, outlook] = await Promise.all([
    loadProfileAndSigner(ws),
    supabase.from("team_documents").select("*").eq("team_id", ws.teamId).order("created_at"),
    supabase.from("team_members").select("email, role, joined_at").eq("team_id", ws.teamId).order("invited_at"),
    has("MICROSOFT_CLIENT_ID") ? getOutlookConnection(ws.userId) : Promise.resolve(null),
  ]);

  let signatureUrl: string | null = null;
  if (signer?.signature_path) {
    const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(signer.signature_path, 600);
    signatureUrl = data?.signedUrl ?? null;
  }

  const outlookMsg = typeof sp.outlook === "string" ? OUTLOOK_MESSAGES[sp.outlook] : null;

  return (
    <div className="max-w-[720px]">
      <h1 className="t-title">Settings</h1>
      <nav aria-label="Settings sections" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <a href="#business" className="hover:text-ink">Certificate details</a>
        <a href="#signature" className="hover:text-ink">Signature</a>
        <a href="#documents" className="hover:text-ink">Documents</a>
        <a href="#email" className="hover:text-ink">Email</a>
        <a href="#team" className="hover:text-ink">Team</a>
      </nav>
      {sp.welcome ? (
        <p className="mt-3 text-muted">Fill in your certificate details once. Every certificate is made from them.</p>
      ) : null}

      <Section id="business" title="Certificate details" intro="Shared by everyone in your workspace. These go on every certificate.">
        <ProfileForm profile={profile} />
      </Section>

      <Section id="signature" title="Your signature" intro="Only you can sign with your signature. Each person in the workspace adds their own.">
        <SignerForm signer={signer} signatureUrl={signatureUrl} />
      </Section>

      <Section
        id="documents"
        title="Documents"
        intro="Files some vendors ask for alongside the certificate, like a copy of your seller's permit, business license or W-9."
      >
        <Documents docs={((docs ?? []) as TeamDocument[]).map(({ id, label, file_name }) => ({ id, label, file_name }))} />
      </Section>

      <Section
        id="email"
        title="Email"
        intro="Certificates are sent from Trade Side under your firm's name. Replies come to your own inbox and you get a copy of each one. If you'd rather send from Outlook yourself, connect it here to get drafts instead."
      >
        {outlookMsg ? <p className="mb-3 text-sm text-forest">{outlookMsg}</p> : null}
        {!has("MICROSOFT_CLIENT_ID") ? (
          <p className="text-sm text-muted">Nothing to set up. Outlook drafts aren&rsquo;t available on this site yet.</p>
        ) : outlook ? (
          <div className="flex flex-wrap items-center gap-4">
            <p>
              Connected as <span className="font-semibold">{outlook.email}</span>
            </p>
            <form action={disconnectOutlookAction}>
              <button className="btn btn-quiet">Disconnect</button>
            </form>
          </div>
        ) : (
          <a href="/api/outlook/connect" className="btn btn-quiet">
            Connect Outlook (optional)
          </a>
        )}
      </Section>

      <Section id="team" title="Team" intro={`People who can sign in to ${ws.teamName}.`}>
        <ul className="divide-y divide-rule border-y border-rule mb-6">
          {((members ?? []) as { email: string; role: string; joined_at: string | null }[]).map((m) => (
            <li key={m.email} className="flex items-center gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate">{m.email}</p>
                <p className="text-sm text-muted">
                  {m.role === "owner" ? "Owner" : "Member"}
                  {m.joined_at ? "" : ", hasn't signed in yet"}
                </p>
              </div>
              {ws.role === "owner" && m.email.toLowerCase() !== ws.email.toLowerCase() ? (
                <form action={removeMember.bind(null, m.email)} className="ml-auto">
                  <button className="text-sm text-muted hover:text-alert">Remove</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {ws.role === "owner" ? <InviteForm /> : <p className="text-sm text-muted">Ask a workspace owner to add people.</p>}
      </Section>
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sheet p-6 mt-6 scroll-mt-24">
      <h2 className="t-name">{title}</h2>
      <p className="text-muted mt-1 mb-6 max-w-prose text-sm">{intro}</p>
      {children}
    </section>
  );
}
