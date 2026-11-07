# Trade Side

Tools for interior designers working with vendors to the trade. The first tool files resale certificates:

1. Paste a vendor's website.
2. The app reads the vendor's site, finds their trade program and how they want certificates (email, online form, account sign-up, or a rep).
3. It fills in and signs the California resale certificate (CDTFA-230) for that vendor.
4. It files it: an Outlook draft with the certificate attached (you press Send), or a cloud browser that fills the vendor's online application and stops for you to review and submit.
5. The vendor list shows who you've filed with, when, and how, so nothing gets filed twice.

Workspaces are multi-tenant: each design firm has its own members, certificate details, documents and vendor list.

## Stack

- Next.js 16 (App Router, server actions, `after()` for background work) on Vercel
- Supabase: Postgres with row-level security, magic-link auth, private storage
- Anthropic (Claude) for reading vendor sites; Firecrawl for crawling them
- pdf-lib for filling the official state PDF
- Microsoft Graph for Outlook drafts
- Browserbase + Stagehand for filling vendor web forms

## Layout

| Path | What it is |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Schema, RLS policies, storage bucket |
| `forms/` + `src/lib/forms/` | Official state PDFs and the registry that fills them. Add a state here. |
| `src/lib/research.ts` | Vendor site crawl and extraction |
| `src/lib/jobs/` | Background jobs: research and online-form filling |
| `src/lib/outlook.ts` | Outlook connection, drafts, sent detection |
| `src/app/actions.ts` | Server actions for the whole app |
| `src/app/(app)/` | Signed-in pages: vendors, vendor detail, settings |

## Setup

### 1. Supabase

Create a new Supabase project (keep it separate from other businesses), then run the migration:

```bash
supabase link --project-ref <ref>
supabase db push
```

or paste `supabase/migrations/0001_init.sql` into the SQL editor.

In **Authentication > URL Configuration**, set the Site URL to `https://thetradeside.com` and add `https://thetradeside.com/auth/callback` (and `http://localhost:3000/auth/callback` for local work) to Redirect URLs.

### 2. Microsoft (Outlook drafts)

In the [Entra admin center](https://entra.microsoft.com) > App registrations > New registration:

- Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
- Redirect URI (Web): `https://thetradeside.com/api/outlook/callback`
- API permissions (Microsoft Graph, delegated): `offline_access`, `openid`, `email`, `User.Read`, `Mail.ReadWrite`
- Certificates & secrets: create a client secret

Copy the Application (client) ID and secret into `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`. If a firm's Microsoft 365 is managed by IT or GoDaddy, an admin may need to approve the app the first time.

The app only ever creates drafts. It never sends email.

### 3. API keys

- `ANTHROPIC_API_KEY` from console.anthropic.com
- `FIRECRAWL_API_KEY` from firecrawl.dev
- `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` from browserbase.com (optional; the online-form option stays hidden without them)

### 4. Environment

Copy `.env.example` to `.env.local` for local work, and set the same variables in Vercel. Generate the two secrets with `openssl rand -base64 32`.

Set `BOOTSTRAP_OWNER_EMAILS` to the email that should create the first workspace. Keep `SIGNUP_MODE=invite` until you're ready for other firms to sign up.

### 5. Run

```bash
npm install
npm run dev
```

## How filing stays safe

- Certificates are signed only with the signature the signer drew or uploaded themselves.
- Emails are drafts in the designer's own Outlook. A person always presses Send.
- The online-form assistant never submits, never types passwords and never solves verification checks. It hands over to a person in a live view.
- Outlook tokens are encrypted at rest; storage is private and read only by the server after a workspace check.

## Adding a state

Add the official PDF under `forms/<state>/`, then add an entry to `FORMS` in `src/lib/forms/index.ts` mapping its field names. `scripts/test-fill.mts` fills a sample certificate for a visual check:

```bash
npx tsx --conditions=react-server scripts/test-fill.mts signature.png out.pdf
```
