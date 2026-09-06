import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents disabled to support dynamic data fetching in pages
  allowedDevOrigins: ['127.0.0.1']
};

export default nextConfig;
