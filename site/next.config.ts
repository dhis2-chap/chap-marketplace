import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The registry YAML lives at the repository root, one level above site/.
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Verification moved under Docs; keep old links working.
  async redirects() {
    return [
      { source: "/verification", destination: "/docs/verification", permanent: true },
    ];
  },
};

export default nextConfig;
