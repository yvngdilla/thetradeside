import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Browser automation and PDF libraries run as plain Node packages, not bundled.
  serverExternalPackages: ["@browserbasehq/stagehand", "@browserbasehq/sdk", "pdf-lib"],
  experimental: {
    serverActions: {
      // Document uploads (up to 2.5 MB) and drawn signatures go through server actions.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
