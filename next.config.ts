import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/csp";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
