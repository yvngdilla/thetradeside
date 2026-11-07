import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";
import { APP_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="min-h-dvh grid md:grid-cols-[1.1fr_1fr]">
      <section className="bg-forest text-on-forest px-6 py-10 md:px-14 md:py-16 flex flex-col justify-between rounded-[var(--radius-sm)] md:m-3">
        <Wordmark tone="on-forest" className="h-9 w-auto self-start" />
        <div className="max-w-md my-16">
          <h1 className="font-display text-5xl md:text-[54px] md:leading-[56px]">
            Every vendor, <em>one certificate.</em>
          </h1>
          <p className="mt-6 text-lg leading-7 text-on-forest/85">
            Give it a vendor&rsquo;s website. It finds where the certificate goes, fills it in for your signature, and keeps a record of who
            has it on file.
          </p>
        </div>
        <p className="text-sm text-on-forest/70">{APP_TAGLINE}</p>
      </section>
      <section className="px-6 py-12 md:px-14 md:py-16 flex items-center">
        <div className="w-full max-w-sm">
          <h2 className="t-title">Sign in</h2>
          <p className="text-muted mt-2">
            We&rsquo;ll email you a link, no password needed. New here? Use the same form to set up your firm.
          </p>
          {error ? <p className="mt-4 text-sm text-alert">That link expired or was already used. Send a new one.</p> : null}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
