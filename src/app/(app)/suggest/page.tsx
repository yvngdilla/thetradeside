import { Doodle } from "@/components/doodle";
import { PaperShape } from "@/components/paper-shape";
import type { Metadata } from "next";
import { getWorkspace } from "@/lib/workspace";
import { createUserClient } from "@/lib/supabase/server";
import { FEATURE_REQUEST_STATUS, type FeatureRequest } from "@/lib/feature-requests";
import { SuggestForm } from "./suggest-form";

export const metadata: Metadata = { title: "Suggest a feature" };

export default async function SuggestPage() {
  const ws = await getWorkspace();
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("feature_requests")
    .select("id, email, task, current_process, status, created_at")
    .eq("team_id", ws.teamId)
    .order("created_at", { ascending: false })
    .limit(50);
  const requests = ((data ?? []) as FeatureRequest[]).map((r) => ({ ...r, status: r.status ?? "new" }));

  return (
    <div className="max-w-[720px]">
      <Doodle name="table" className="hidden xl:block absolute -right-36 top-8 h-36 w-36" />
      <p className="t-hand -rotate-2 w-fit mb-2">we read every one</p>
      <h1 className="t-title">What should we take off your plate next?</h1>
      <p className="mt-3 text-muted max-w-prose">
        Trade Side started with resale certificates, a chore every studio repeats with every vendor. Tell us about another one: a form, a
        follow-up, a spreadsheet you keep up by hand. We read every suggestion and build the ones that would save the most time.
      </p>

      <div className="relative mt-10">
        <PaperShape tone="sage" cut={1} className="-inset-x-[5%] -inset-y-[8%]" />
        <section className="relative sheet p-5 sm:p-6">
          <SuggestForm />
        </section>
      </div>

      {requests.length ? (
        <section className="mt-12" aria-labelledby="suggested-title">
          <h2 id="suggested-title" className="t-name">
            Suggested by {ws.teamName}
          </h2>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {requests.map((r) => (
              <li key={r.id} className="py-4">
                <p className="whitespace-pre-line [overflow-wrap:anywhere]">{r.task}</p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="text-sm text-muted">
                    {[r.email === ws.email ? "You" : r.email, formatDate(r.created_at)].filter(Boolean).join(", ")}
                  </p>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      r.status === "shipped" ? "border-good text-good" : "border-rule text-muted"
                    }`}
                  >
                    {FEATURE_REQUEST_STATUS[r.status] ?? r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
}
