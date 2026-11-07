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
      // Document uploads go through server actions. Vercel caps request bodies at 4.5 MB.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
