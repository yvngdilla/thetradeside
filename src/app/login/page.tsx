import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";
import { Doodle } from "@/components/doodle";
import { PaperShape } from "@/components/paper-shape";
import { env } from "@/lib/env";
import { turnstileEnabled } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="min-h-dvh overflow-hidden grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[1.1fr_1fr]">
      <section className="relative px-6 pt-6 pb-12 md:px-12 md:pt-10 md:pb-16 flex flex-col justify-between gap-10">
        <PaperShape tone="terracotta" className="-left-[22%] top-[9%] h-full w-[118%]" />
        <Wordmark dot="ink" className="relative text-[24px] self-start" />
        <div className="relative max-w-[520px]">
          <p className="t-hand !text-ink -rotate-2 w-fit mb-3">for interior designers</p>
          <h1 className="font-display text-[40px] leading-[1.04] tracking-[-0.035em] md:text-[clamp(44px,5vw,72px)]">
            Trade accounts, without the paperwork.
          </h1>
          <p className="mt-5 md:mt-6 text-base leading-6 md:text-lg md:leading-7 max-w-[440px]">
            Give it a vendor&rsquo;s website. It finds where the certificate goes, fills it in for your signature, and keeps a record of who
            has it on file.
          </p>
        </div>
        <div aria-hidden className="relative hidden md:flex items-end gap-6">
          <Doodle name="sofa" className="h-32 w-32 -mb-3" />
          <Doodle name="frame" className="h-24 w-24" />
          <Doodle name="pendant" className="h-28 w-28 mb-3" />
        </div>
      </section>
      <section className="relative px-6 pt-4 pb-12 md:px-12 md:py-16 flex md:items-center">
        <div className="w-full max-w-sm">
          <h2 className="t-title">Sign in</h2>
          <p className="text-muted mt-2">
            We&rsquo;ll email you a link, no password needed. New here? Use the same form to set up your firm.
          </p>
          {error ? <p className="mt-4 text-sm text-alert">That link expired or was already used. Send a new one.</p> : null}
          <LoginForm turnstileSiteKey={turnstileEnabled() ? env.turnstileSiteKey() : null} />
        </div>
      </section>
    </main>
  );
}
