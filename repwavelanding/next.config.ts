import type { NextConfig } from "next";

const repwaveApi =
  process.env.REPWAVE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5050/api";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/repwave/:path*",
        destination: `${repwaveApi}/:path*`,
      },
    ];
  },
};

export default nextConfig;
