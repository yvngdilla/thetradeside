import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// The public pages. Add a page here when it can be read without signing in.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
