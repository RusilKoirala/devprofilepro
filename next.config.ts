import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf ships its own font/layout engine; keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Two resume PDFs of up to 5 MB each are uploaded through a server action.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
