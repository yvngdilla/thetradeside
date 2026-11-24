import type { Metadata } from "next";
import Link from "next/link";
import { Doodle } from "@/components/doodle";
import { HandArrow, HandNote, PaperShape } from "@/components/paper-shape";
import { Facts } from "@/components/sheet";
import { ItemStatusTag, StatusTag } from "@/components/status-tag";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

// The public homepage. Signed-out visitors to "/" are shown this page (see src/proxy.ts);
// signed-in designers go straight to their vendors.
export const metadata: Metadata = {
  title: { absolute: `${APP_NAME}: resale certificates, trade accounts and FF&E for interior designers` },
  description:
    "Trade Side fills in resale certificates, works out trade accounts and turns product links into FF&E records for interior design studios. You review, sign and send.",
  alternates: { canonical: "/" },
};

const SAMPLE_VENDORS = [
  { name: "Marlow Upholstery", note: "Sent to the trade desk by email", status: "filed" },
  { name: "Alder Finch Lighting", note: "Uploaded through their trade form", status: "filed" },
  { name: "Northfield Stone", note: "Filled in, waiting for your signature", status: "ready" },
  { name: "Calder Textiles", note: "Reading their trade program", status: "researching" },
] as const;

const QUESTIONS = [
  {
    q: "What is a resale certificate?",
    a: "A form you give a vendor to say you are buying goods to resell. The vendor then does not charge you sales tax on that purchase, and you collect it from your client when you sell the goods on.",
  },
  {
    q: "Do interior designers need a resale certificate?",
    a: "If you buy furnishings and resell them to clients, most to-the-trade vendors ask for one before they sell tax-free or open a trade account. You need a seller's permit from your state first.",
  },
  {
    q: "What does FF&E mean?",
    a: "Furniture, fixtures and equipment: the movable things specified for a project, from sofas and rugs to lighting. In Trade Side each one is an item with its specs, vendor and pricing.",
  },
  {
    q: "Which states does Trade Side cover?",
    a: "It fills in the California general resale certificate, form CDTFA-230, today. Each vendor's page says what that vendor asks for.",
  },
  {
    q: "Does it replace Studio Designer or Programa?",
    a: "No. They keep your proposals, invoices and accounting. Trade Side handles certificates, trade accounts and the item record, so you type each vendor and product once.",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <header className="mx-auto max-w-[1200px] px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <Link href="/home" aria-label={APP_NAME}>
          <Wordmark className="text-[26px]" />
        </Link>
        <nav aria-label="Main" className="hidden md:flex items-center gap-8 text-[15px] font-medium">
          <a href="#certificates" className="py-3 hover:text-accent">Certificates</a>
          <a href="#accounts" className="py-3 hover:text-accent">Trade accounts</a>
          <a href="#items" className="py-3 hover:text-accent">Items</a>
          <a href="#questions" className="py-3 hover:text-accent">Questions</a>
        </nav>
        <div className="flex items-center gap-5">
          <Link href="/login" className="py-3 text-[15px] font-medium hover:text-accent">
            Sign in
          </Link>
          <Link href="/login" className="btn btn-primary">
            Set up your firm
          </Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-[1200px] px-5 sm:px-8 pt-16 sm:pt-24 flex flex-col items-center text-center">
          <div aria-hidden className="hidden xl:block absolute left-6 top-[300px] h-[250px] w-[190px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute left-0 bottom-0 h-[190px] w-[150px] text-sage">
              <path d="M8 100 L8 46 C 8 14, 92 12, 92 46 L92 100 Z" fill="currentColor" />
            </svg>
            <Doodle name="vase" className="absolute left-5 top-0 h-44 w-44" />
          </div>
          <div aria-hidden className="hidden xl:block absolute right-6 top-[330px] h-[230px] w-[190px]">
            <svg viewBox="0 0 100 100" className="absolute right-0 top-8 h-[170px] w-[170px] text-blush">
              <path d="M50 8 C 78 4, 96 28, 92 54 C 88 82, 62 98, 36 92 C 12 86, 2 60, 8 36 C 13 18, 30 10, 50 8 Z" fill="currentColor" />
            </svg>
            <Doodle name="lamp" className="absolute right-5 top-0 h-40 w-40" />
          </div>

          <p className="t-hand !text-[26px] -rotate-2 mb-6">for interior designers</p>
          <h1 className="font-display text-[clamp(44px,6.2vw,88px)] leading-[1.03] tracking-[-0.035em]">
            Trade accounts,
            <br />
            without the{" "}
            <span className="relative inline-block text-accent">
              paperwork.
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -left-[2%] -bottom-[0.2em] h-[0.2em] w-[104%] text-terracotta">
                <path d="M4 9 C 70 3, 170 2, 296 7 C 210 8, 110 11, 30 19" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-10 max-w-[620px] text-[19px] leading-[30px] sm:text-xl sm:leading-[31px] text-muted">
            Resale certificates, trade accounts and product specs for your studio, filled in for you. So you can get back to the room.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn btn-primary !px-7 !py-3.5 !text-base">
              Set up your firm
            </Link>
            <a href="#certificates" className="btn btn-quiet !px-7 !py-3.5 !text-base">
              See how it works
            </a>
          </div>

          <Showcase tone="terracotta" className="mt-20 sm:mt-24">
            <HandNote className="-left-48 top-36 -rotate-6">
              already filled in
              <HandArrow className="ml-14 mt-1" />
            </HandNote>
            <HandNote className="-right-48 top-64 rotate-3">
              <HandArrow className="-scale-100 mb-1" />
              this part is yours
            </HandNote>
            <div className="relative sheet text-left">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 sm:px-7 py-3.5 border-b border-rule">
                <p className="text-sm text-muted">Vendors / Marlow Upholstery</p>
                <StatusTag status="ready" />
              </div>
              <div className="flex flex-wrap gap-x-12 gap-y-8 px-5 sm:px-7 pt-8 pb-9">
                <div className="min-w-0 flex-[1.3_1_340px]">
                  <p className="t-name !text-[32px] !leading-10">Marlow Upholstery</p>
                  <p className="mt-1.5 mb-6 text-muted">Takes the certificate by email at their trade desk.</p>
                  <Facts
                    rows={[
                      ["Form", "California resale certificate, CDTFA-230"],
                      ["Purchaser", "Studio Lane Interiors"],
                      ["Seller", "Marlow Upholstery, Inc."],
                      ["Buying for resale", "Upholstered furniture"],
                    ]}
                  />
                </div>
                <div className="min-w-0 flex-[1_1_260px] flex flex-col">
                  <p className="label">Your signature</p>
                  <div className="flex-1 min-h-36 flex items-end rounded-[var(--radius-sm)] border border-dashed border-control bg-paper p-5">
                    <div className="w-full flex items-baseline gap-2.5 border-b-[1.5px] border-ink pb-1.5 font-[family-name:var(--font-hand)] text-[26px] leading-6">
                      <span aria-hidden className="font-semibold">x</span>
                      <span className="text-muted">sign here</span>
                    </div>
                  </div>
                  <Link href="/login" className="btn btn-primary mt-4 self-start">
                    Review and sign
                  </Link>
                </div>
              </div>
            </div>
          </Showcase>
          <p className="relative mt-16 text-sm text-muted">A sample vendor, shown the way it appears in {APP_NAME}.</p>
        </section>

        <Feature id="certificates" label="resale certificates" title="Every vendor, one certificate." tone="sage" cut={1}>
          Give it a vendor&rsquo;s website. It finds where the certificate goes, fills it in from your firm&rsquo;s details and keeps a record
          of who has it on file.
          <ul className="relative sheet px-5 sm:px-7 py-1 text-left divide-y divide-rule">
            {SAMPLE_VENDORS.map((v) => (
              <li key={v.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-[18px]">
                <div>
                  <p className="t-name">{v.name}</p>
                  <p className="text-sm text-muted">{v.note}</p>
                </div>
                <StatusTag status={v.status} />
              </li>
            ))}
          </ul>
        </Feature>

        <Feature id="accounts" label="trade accounts" title="Every discount, remembered." tone="ochre" cut={2}>
          It reads each vendor&rsquo;s trade program: what they ask for, where the application goes and the discount they give. Your terms stay
          with the vendor.
          <div className="relative sheet px-5 sm:px-7 pt-7 pb-6 text-left">
            <p className="t-name !text-[30px] !leading-9">Marlow Upholstery</p>
            <p className="mt-1 mb-5 text-sm text-muted">Trade program</p>
            <Facts
              rows={[
                ["They ask for", "California resale certificate, business card"],
                ["Where it goes", "Email to the trade desk"],
                ["Your discount", <strong key="d">20% off retail</strong>],
                ["Your markup", <strong key="m">25%</strong>],
              ]}
            />
          </div>
        </Feature>

        <Feature id="items" label="items, in early access" title="Paste a link. Get the spec." tone="sky" cut={0}>
          {APP_NAME} reads the product page, then works out your cost and the client price from that vendor&rsquo;s terms. One FF&amp;E record
          per item, typed by nobody.
          <div className="relative sheet text-left">
            <div className="flex flex-wrap items-center gap-3 px-5 sm:px-7 py-4 border-b border-rule">
              <p className="field !w-auto min-w-0 flex-[1_1_260px] truncate text-muted">marlowupholstery.example/products/wool-rug-9x12</p>
              <span className="btn btn-primary">Add item</span>
            </div>
            <div className="flex flex-wrap gap-x-12 gap-y-7 px-5 sm:px-7 pt-7 pb-8">
              <div className="min-w-0 flex-[1_1_300px]">
                <ItemStatusTag status="ready" />
                <p className="t-name !text-[30px] !leading-9 mt-3.5 mb-5">Hand-knotted wool rug, 9 x 12</p>
                <Facts
                  rows={[
                    ["Maker", "Marlow Upholstery"],
                    ["SKU", "MP-RUG-912"],
                    ["Lead time", "6 to 8 weeks"],
                  ]}
                />
              </div>
              <div className="min-w-0 flex-[1_1_300px] tabular-nums">
                <p className="label">Price</p>
                <dl className="border-t border-rule">
                  {[
                    ["Retail", "$2,139.00"],
                    ["Your cost, 20% off", "$1,711.20"],
                    ["Freight, at cost", "$328.00"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-rule">
                      <dt className="text-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 pt-3 font-semibold">
                    <dt>Client total</dt>
                    <dd>$2,467.00</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </Feature>

        <section id="questions" className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-36 sm:pt-48 flex flex-col items-center scroll-mt-8">
          <p className="t-hand !text-[26px] -rotate-2 mb-3.5">questions</p>
          <h2 className="font-display text-center text-[clamp(36px,4.6vw,64px)] leading-[1.05] tracking-[-0.03em]">What designers ask first.</h2>
          <div className="mt-14 w-full max-w-[720px] border-t border-rule">
            {QUESTIONS.map(({ q, a }) => (
              <div key={q} className="py-6 border-b border-rule">
                <h3 className="text-lg leading-7 font-semibold">{q}</h3>
                <p className="mt-2 text-base leading-[26px] text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-36 sm:pt-48 pb-32 sm:pb-40 flex flex-col items-center text-center">
          <svg aria-hidden viewBox="0 0 300 90" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="h-[72px] w-60">
            <path className="text-ink" stroke="currentColor" d="M14 62 C 24 20, 44 14, 42 44 C 40 72, 58 26, 72 30 C 88 34, 70 66, 88 56 C 104 46, 108 26, 120 44 C 128 58, 142 40, 156 38 C 176 36, 168 62, 190 52 C 214 40, 236 46, 286 40" />
            <path className="text-terracotta" stroke="currentColor" d="M10 78 C 90 72, 190 70, 290 74" />
          </svg>
          <h2 className="mt-7 font-display text-[clamp(36px,4.6vw,64px)] leading-[1.05] tracking-[-0.03em]">Signed by you, never for you.</h2>
          <p className="mt-5 max-w-[560px] text-lg leading-[29px] text-muted">
            {APP_NAME} prepares the paperwork and stops. Nothing is signed, sent to a vendor or submitted online until you do it yourself.
          </p>
          <Link href="/login" className="btn btn-primary mt-9 !px-7 !py-3.5 !text-base">
            Set up your firm
          </Link>
        </section>
      </main>

      <footer className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="border-t border-rule py-7 pb-12 flex flex-wrap justify-between gap-x-10 gap-y-3 text-sm text-muted">
          <p className="max-w-[460px]">
            {APP_TAGLINE} {APP_NAME} prepares paperwork for your review. It is not tax or legal advice.
          </p>
          <p className="flex flex-wrap gap-x-6">
            <a href="#certificates" className="link py-2.5">Certificates</a>
            <a href="#accounts" className="link py-2.5">Trade accounts</a>
            <a href="#items" className="link py-2.5">Items</a>
            <Link href="/login" className="link py-2.5">Sign in</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A product screen laid on a cut-paper shape. */
function Showcase({
  tone,
  cut = 0,
  className = "",
  children,
}: {
  tone: "terracotta" | "sage" | "ochre" | "sky";
  cut?: 0 | 1 | 2;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative w-full max-w-[900px] ${className}`}>
      <PaperShape tone={tone} cut={cut} className="-inset-x-[8%] -inset-y-[11%]" />
      {children}
    </div>
  );
}

/** One feature: a handwritten label, a short headline, one sentence and one product screen. */
function Feature({
  id,
  label,
  title,
  tone,
  cut,
  children,
}: {
  id: string;
  label: string;
  title: string;
  tone: "terracotta" | "sage" | "ochre" | "sky";
  cut: 0 | 1 | 2;
  children: [...React.ReactNode[], React.ReactNode];
}) {
  const screen = children[children.length - 1];
  const text = children.slice(0, -1);
  return (
    <section id={id} className="mx-auto max-w-[1200px] px-5 sm:px-8 pt-36 sm:pt-48 flex flex-col items-center text-center scroll-mt-8">
      <p className="t-hand !text-[26px] -rotate-2 mb-3.5">{label}</p>
      <h2 className="font-display text-[clamp(36px,4.6vw,64px)] leading-[1.05] tracking-[-0.03em]">{title}</h2>
      <p className="mt-5 max-w-[560px] text-lg leading-[29px] text-muted">{text}</p>
      <Showcase tone={tone} cut={cut} className="mt-16 sm:mt-[72px]">
        {screen}
      </Showcase>
    </section>
  );
}
