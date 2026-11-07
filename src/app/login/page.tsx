import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";
import { APP_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="min-h-dvh grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[1.1fr_1fr]">
      <section className="bg-forest text-on-forest px-6 py-7 md:px-14 md:py-16 flex flex-col justify-between rounded-[var(--radius-sm)] md:m-3">
        <Wordmark tone="on-forest" className="h-9 w-auto self-start" />
        <div className="max-w-md mt-8 md:my-16">
          <h1 className="font-display text-4xl leading-[42px] md:text-[54px] md:leading-[56px]">
            Every vendor, <em>one certificate.</em>
          </h1>
          <p className="mt-4 md:mt-6 text-base leading-6 md:text-lg md:leading-7 text-on-forest/85">
            Give it a vendor&rsquo;s website. It finds where the certificate goes, fills it in for your signature, and keeps a record of who
            has it on file.
          </p>
        </div>
        <p className="hidden md:block text-sm text-on-forest/70">{APP_TAGLINE}</p>
      </section>
      <section className="px-6 pt-8 pb-12 md:px-14 md:py-16 flex md:items-center">
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
