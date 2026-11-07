import "server-only";
import { z } from "zod";
import { Browserbase } from "@browserbasehq/sdk";
import { browserbase, Stagehand, type Page } from "@browserbasehq/stagehand";
import { env } from "@/lib/env";
import { structured } from "@/lib/llm";
import { createAdminClient } from "@/lib/supabase/server";
import { addStep, buildCertificate, loadDocuments, loadFilingContext } from "@/lib/filing";
import type { OpenItem } from "@/lib/types";
import { isDemo } from "@/lib/demo/store";

// Opens the vendor's trade application in a cloud browser, fills in what it can
// from the workspace profile, attaches the certificate, and stops. It never
// submits, never types passwords and never solves CAPTCHAs: a person reviews the
// form in the live view and presses the vendor's submit button themselves.

const FormSchema = z.object({
  form_found: z.boolean().describe("True if this page shows a trade, designer or account application form."),
  login_required: z.boolean().describe("True if the page asks the visitor to sign in or create a password before applying."),
  captcha_present: z.boolean(),
  fields: z.array(
    z.object({
      label: z.string().describe("The visible label or placeholder of the field."),
      kind: z.enum(["text", "email", "tel", "textarea", "select", "checkbox", "radio", "file", "password", "date", "other"]),
      required: z.boolean(),
      options: z.array(z.string()).describe("Choices for select or radio fields; empty otherwise."),
    }),
  ),
});

const PlanSchema = z.object({
  assignments: z.array(
    z.object({
      label: z.string().describe("Field label exactly as given."),
      action: z.enum(["fill", "select", "check", "upload", "skip"]),
      value: z.string().describe("Text to type, option to select, or for upload the file key. Empty for check/skip."),
      reason: z.string().describe("For skip: why, in a few words a designer understands."),
    }),
  ),
});

export async function runPortalJob(filingId: string, userId: string) {
  const admin = createAdminClient();
  const { data: filing } = await admin.from("filings").select("*").eq("id", filingId).single();
  if (!filing) return;
  if (isDemo()) return runDemoPortal(filing as { id: string; team_id: string; vendor_id: string }, userId);

  let browser: Awaited<ReturnType<typeof browserbase.launch>> | null = null;
  try {
    const ctx = await loadFilingContext(filing.team_id, userId, filing.vendor_id);
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const cert = await buildCertificate(ctx, filingId);
    const docs = await loadDocuments(filing.team_id, filing.attached_document_ids ?? []);
    await admin.from("filings").update({ certificate_path: cert.path, form_code: cert.formCode }).eq("id", filingId);
    await addStep(filingId, "Signed certificate prepared");

    browser = await browserbase.launch({
      apiKey: env.browserbaseApiKey(),
      projectId: env.browserbaseProjectId(),
      keepAlive: true,
      api_timeout: 3600,
    });
    const sessionId = browser.sessionId!;
    const live = await new Browserbase({ apiKey: env.browserbaseApiKey() }).sessions.debug(sessionId);
    await admin
      .from("filings")
      .update({ status: "portal_running", browser_session_id: sessionId, live_view_url: live.debuggerFullscreenUrl })
      .eq("id", filingId);

    const stagehand = await Stagehand.create({
      browser,
      model: { modelName: env.stagehandModel() as `anthropic/${string}`, apiKey: env.anthropicApiKey() },
    });
    const page: Page = (await browser.context.activePage()) ?? (await browser.context.newPage());

    const start = ctx.vendor.application_url || ctx.vendor.trade_url || `https://${ctx.vendor.domain}`;
    await page.goto(start);
    await addStep(filingId, `Opened ${start}`);

    let form = (await stagehand.extract("Describe the trade program or designer account application form on this page.", FormSchema)).data;
    if (!form.form_found) {
      const { data: links } = await stagehand.observe(
        "the link or button that opens the trade program application, designer account sign-up, or trade account form",
      );
      if (links[0]) {
        await stagehand.act(links[0]);
        await addStep(filingId, `Followed "${links[0].description}"`);
        form = (await stagehand.extract("Describe the trade program or designer account application form on this page.", FormSchema)).data;
      }
    }

    const openItems: OpenItem[] = [];
    if (!form.form_found) {
      openItems.push({ label: "Application form", reason: "No application form was found. Find it in the live view, or file by email instead." });
    }
    if (form.login_required) openItems.push({ label: "Sign in or create an account", reason: "The vendor needs a login first. Enter it yourself in the live view." });
    if (form.captcha_present) openItems.push({ label: "Verification check", reason: "Complete the 'I'm not a robot' check yourself." });

    if (form.form_found && form.fields.length) {
      const [first, ...rest] = ctx.signer.printed_name.trim().split(/\s+/);
      const files: Record<string, { name: string; mimeType: string; buffer: Uint8Array }> = {
        certificate: { name: cert.fileName, mimeType: "application/pdf", buffer: cert.bytes },
        ...Object.fromEntries(docs.map((d) => [`doc:${d.id}`, { name: d.file_name, mimeType: d.mime_type, buffer: d.bytes }])),
      };
      const facts = {
        "Company / firm name": ctx.profile.business_name,
        "Legal name on certificate": ctx.profile.purchaser_name,
        "Contact first name": first ?? "",
        "Contact last name": rest.join(" "),
        "Contact full name": ctx.signer.printed_name,
        "Job title": ctx.signer.title,
        Email: authUser.user?.email ?? "",
        Phone: ctx.profile.phone,
        "Street address": ctx.profile.address_line1,
        "Address line 2": ctx.profile.address_line2,
        City: ctx.profile.city,
        State: ctx.profile.state,
        "ZIP / postal code": ctx.profile.postal_code,
        Country: "United States",
        Website: ctx.profile.website,
        "Seller's permit / resale number / tax ID for resale": ctx.profile.seller_permit,
        "Type of business": "Interior design",
        "What the business sells": ctx.profile.business_type,
      };
      const plan = await structured({
        system:
          "You fill in a vendor's trade account application for an interior design firm. Map each form field to the firm's facts. Rules: never fill password, credit card, bank, or Social Security / EIN fields that are not in the facts (skip them with a reason); never invent facts; skip fields you have no fact for and say what's needed; for file uploads, use the file key that best matches (the resale certificate is 'certificate'); for selects and radios, value must be one of the listed options; check a checkbox only for a terms or agreement box when the firm clearly qualifies, otherwise skip it so the designer reads it.",
        prompt: JSON.stringify({ fields: form.fields, facts, files: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, f.name])) }, null, 2),
        schema: PlanSchema,
      });

      for (const a of plan.assignments) {
        try {
          if (a.action === "skip") {
            const field = form.fields.find((f) => f.label === a.label);
            if (field?.required || field?.kind === "password") openItems.push({ label: a.label, reason: a.reason || "Needs your input" });
            continue;
          }
          if (a.action === "upload") {
            const file = files[a.value];
            if (!file) throw new Error("no matching file");
            const { data: inputs } = await stagehand.observe(`the file upload input for "${a.label}"`);
            if (!inputs[0]) throw new Error("upload control not found");
            await page.locator(inputs[0].selector).setInputFiles(file);
            await addStep(filingId, `Attached ${file.name} to "${a.label}"`);
            continue;
          }
          const instruction =
            a.action === "fill"
              ? `type %value% into the "${a.label}" field`
              : a.action === "select"
                ? `select "${a.value}" in the "${a.label}" field`
                : `check the "${a.label}" checkbox`;
          await stagehand.act(instruction, { variables: { value: a.value } });
          await addStep(filingId, a.action === "check" ? `Checked "${a.label}"` : `Filled "${a.label}"`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          openItems.push({ label: a.label, reason: `Couldn't fill this automatically (${msg}).` });
          await addStep(filingId, `Couldn't fill "${a.label}"`, false);
        }
      }
    }

    await admin.from("filings").update({ status: "awaiting_review", open_items: openItems }).eq("id", filingId);
    await addStep(filingId, "Ready for your review. Nothing has been submitted.");
    await browser.disconnect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("filings").update({ status: "failed", error: msg }).eq("id", filingId);
    await addStep(filingId, `Stopped: ${msg}`, false);
    await browser?.close().catch(() => {});
    await admin.from("vendors").update({ status: "ready" }).eq("id", filing.vendor_id).eq("status", "in_progress");
  }
}

/** Ends the cloud browser session for a filing. */
export async function releaseBrowser(sessionId: string | null) {
  if (!sessionId) return;
  await new Browserbase({ apiKey: env.browserbaseApiKey() }).sessions
    .update(sessionId, { projectId: env.browserbaseProjectId(), status: "REQUEST_RELEASE" })
    .catch(() => {});
}

/** Demo mode: walks through the same steps without opening a browser. */
async function runDemoPortal(filing: { id: string; team_id: string; vendor_id: string }, userId: string) {
  const admin = createAdminClient();
  const pause = () => new Promise((r) => setTimeout(r, 1200));
  const ctx = await loadFilingContext(filing.team_id, userId, filing.vendor_id);
  const cert = await buildCertificate(ctx, filing.id);
  await admin.from("filings").update({ certificate_path: cert.path, status: "portal_running" }).eq("id", filing.id);
  await addStep(filing.id, "Signed certificate prepared");
  for (const step of [
    `Opened ${ctx.vendor.application_url || `https://${ctx.vendor.domain}`}`,
    'Filled "Company name"',
    'Filled "Contact name"',
    'Filled "Email"',
    'Filled "Phone"',
    'Filled "Resale or seller\'s permit number"',
    'Attached the certificate to "Resale certificate"',
  ]) {
    await pause();
    await addStep(filing.id, step);
  }
  await admin
    .from("filings")
    .update({
      status: "awaiting_review",
      open_items: [
        { label: "W-9", reason: "They ask for a W-9. Add one in Settings, or upload it yourself in the form." },
        { label: "Verification check", reason: "Complete the 'I'm not a robot' check yourself." },
      ],
    })
    .eq("id", filing.id);
  await addStep(filing.id, "Ready for your review. Nothing has been submitted. (Demo mode: no browser was opened.)");
}
