import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own font/layout engine; keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Up to two files go through one server action: 5 MB PDFs or a 10 MB LinkedIn ZIP
    // (lib/ingest/limits.ts), plus form fields.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;
