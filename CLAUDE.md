# CLAUDE.md - Trade Side

@AGENTS.md

Trade Side (thetradeside.com) files resale certificates and trade-account
applications for interior designers. README.md covers the product, stack,
layout and setup; read it before larger changes.

## Writing style (applies to ALL output)

**Never use em dashes or en dashes** in any response, commit message, code
comment, documentation, UI string or drafted copy. Use instead:
- A comma, for a light aside.
- A colon, to introduce or expand.
- Parentheses, for a true aside.
- A period and a new sentence, when the clauses can stand alone.
- A hyphen only for genuine compounds (`multi-tenant`, `server-side`).

Do not use a spaced hyphen ( - ) as a stand-in. Rewrite the sentence.

## Keep Trade Side separate from Grey Market

Trade Side has its own GitHub repo, Vercel project, Supabase project, Resend
account and API keys. Never read from, write to or reuse anything belonging
to Grey Market (`~/greymarket*` folders, its Supabase project, its env vars,
its accounts). If a task seems to need something from there, stop and ask.

## Safety: production and real users

- **Never change the production database automatically.** No `supabase db
  push`, no SQL against the production project, no data edits. Write the
  migration in `supabase/migrations/`, and Colston applies it by hand after
  saying go.
- **Anything that reaches real users needs Colston's explicit go-ahead**,
  not a heads-up: sending email, invites, vendor submissions, production
  deploys, env var changes in Vercel.
- The product's own filing rules are not negotiable:
  - Certificates are signed only with a signature the signer drew, typed or
    uploaded themselves.
  - Email to a vendor goes out only when a designer presses Send.
  - Outlook integration only ever creates drafts. It never sends.
  - The online-form assistant never submits, never types passwords and never
    solves verification checks. It hands over to a person.
- Multi-tenant: every read and write is scoped to the current workspace and
  covered by RLS. The secret / service-role key is server-only and is used only
  after a workspace check. Never expose it to client code.

## Commands

```bash
npm install
npm run dev          # localhost:3000
npm run build        # production build (also type-checks)
npm run lint         # ESLint
npx tsx --conditions=react-server scripts/test-fill.mts signature.png out.pdf   # visual check of a filled certificate
```

Demo mode (`DEMO_MODE=1`, or the `demo` branch on Vercel preview) runs on
seeded data in `src/lib/demo/` with no Supabase. It is disabled in production.

## Git workflow

1. **Do not commit directly to `main`.** Work on a branch and open a PR.
   Vercel builds a preview for every push; Colston checks the preview before
   it merges.
2. Before pushing, run `npm run lint` and `npm run build` and fix what they
   report in the files you touched.

## Environment variables

All configuration goes through `src/lib/env.ts`. **Never read `process.env`
directly in app code**; add the variable to `env.ts` first and use it from
there. Exceptions: `src/proxy.ts` and the demo-mode check in
`src/lib/demo/store.ts`. Document every new variable in `.env.example`.

## Shared components: build once, style many

One concept, one piece of code. If two screens show the same thing, they run
the same code, so a fix lands everywhere at once.

- **Rules and data live in one function** in `src/lib/` (filing status, which
  filing method a vendor takes, certificate fields). Never re-derive locally.
- **One component per concept** (status tag, signature pad, vendor row).
  Before building a screen, ask which existing component it is.
- **Presentation varies through tokens and a few named variants**, never by
  copying a component. A component that grows a boolean per caller is several
  components in one: use slots or split it.

## Design system: "Signature"

Source of truth: the "The Trade Side" design system artifact on claude.ai
(https://claude.ai/artifact/LePnsnAe4v4PgpJwbhAh19, `project/README.md` then
`project/tokens.json`). Tokens live in `src/app/globals.css`.

- Type: Instrument Serif (400, roman + italic) for headlines, page titles and
  vendor names, with one key phrase per headline in italic. Instrument Sans
  for everything read or clicked (body 15/24, lead 18/28).
- Colour: style through tokens, never literal hex. Forest is brand and action.
  Clay is only the pen stroke and small accents, **never text**. Alert means
  "needs you".
- Shape: buttons and status tags are pills; sheets and inputs 4px; hero panels
  and colour blocks 2px. Borders, not shadows.
- Status tags: Filed is a forest outline, Ready to file is solid forest,
  Check details is alert on alert-wash.
- Light theme only for now. Use tokens anyway so a dark theme can come later.

## Voice and email

- Plain studio-manager tone, sentence case, no exclamation marks, no emoji,
  no em dashes. Tagline: "Resale certificates and trade accounts, filed once."
- **Never greet someone with a stand-in word** ("Hi there", "Hi friend"). If
  there is no name, the greeting is just `Hi,`. Render the name and its
  leading space together, or omit both.
