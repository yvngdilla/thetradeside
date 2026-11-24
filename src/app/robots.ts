import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Only the homepage and the sign-in page are public. Everything else is a
// designer's own workspace behind sign-in, so crawlers are told not to try.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/items", "/vendors", "/settings", "/suggest", "/welcome"],
    },
    sitemap: `${env.appUrl()}/sitemap.xml`,
  };
}
