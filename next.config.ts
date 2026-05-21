import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.133",
    "192.168.1.12",
    "192.168.1.70",
    "192.168.1.251",
    "192.168.1.22",
    "192.168.1.13",
    "192.168.1.83",
    "192.168.1.102",
    "192.168.1.139",
    "192.168.1.161",
    "192.168.1.38",
    "localhost",
  ],

  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL || "http://localhost:6060";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;