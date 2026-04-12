import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["app.hyperliquid.xyz"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.onrender.com"],
    },
  },
};

export default nextConfig;
