import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="min-h-dvh grid md:grid-cols-[1.1fr_1fr]">
      <section className="bg-chip text-chip-ink px-8 py-12 md:px-14 md:py-16 flex flex-col justify-between">
        <p className="font-display text-2xl">{APP_NAME}</p>
        <div className="max-w-md my-16">
          <h1 className="font-display text-4xl md:text-5xl leading-[1.08]">Every vendor, filed once.</h1>
          <p className="mt-5 text-chip-ink/80 text-lg leading-relaxed">
            Paste a vendor&rsquo;s website. We find their trade program, fill in your resale certificate, and keep a record so you never
            wonder whether you&rsquo;ve already sent one.
          </p>
        </div>
        <p className="text-sm text-chip-ink/60">California resale certificate (CDTFA-230)</p>
      </section>
      <section className="px-8 py-12 md:px-14 md:py-16 flex items-center">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl">Sign in</h2>
          <p className="text-muted mt-2">We&rsquo;ll email you a link. No password needed. New here? Use the same form to set up your firm.</p>
          {error ? <p className="mt-4 text-sm text-oxblood">That link expired or was already used. Send a new one.</p> : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
