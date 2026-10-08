import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg and better-auth run only on the server.
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
};

export default nextConfig;
