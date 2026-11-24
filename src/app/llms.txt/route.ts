import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { env } from "@/lib/env";

// A plain-text summary of the product for AI assistants, in the llms.txt
// format (llmstxt.org). Keep it in step with the homepage in src/app/home.
export const dynamic = "force-static";

export function GET() {
  const base = env.appUrl();
  const body = `# ${APP_NAME}

> ${APP_TAGLINE} ${APP_NAME} is a web app for interior design studios. It fills in resale certificates, works out each vendor's trade account and turns product links into FF&E records. The designer reviews, signs and sends.

The name is "${APP_NAME}", not "The Trade Side".

## What it does

- Resale certificates: give it a vendor's website. It finds where the certificate goes, fills it in from the firm's details and keeps a record of which vendors have it on file. It fills in the California general resale certificate, form CDTFA-230, today.
- Trade accounts: it reads each vendor's trade program: what they ask for, where the application goes and the discount they give. The firm's terms stay with the vendor.
- Items (early access): paste a link to a product page. It reads the name, maker, dimensions, materials, photos and price, then works out the firm's cost and the client price from that vendor's terms.

## What it does not do

- It never signs for the designer. Certificates are signed only with a signature the signer drew, typed or uploaded themselves.
- It never sends anything to a vendor or submits an online form by itself. The designer does that.
- It is not tax or legal advice.
- It does not replace Studio Designer or Programa. They keep proposals, invoices and accounting.

## Who it is for

Interior designers and design studios in the United States who buy furnishings to resell to clients and open to-the-trade accounts with vendors.

## Pages

- [Homepage](${base}/): what ${APP_NAME} does, with sample screens and common questions
- [Sign in](${base}/login): sign in or set up a firm

Everything else is a firm's private workspace behind sign-in.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
