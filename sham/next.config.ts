import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export for development - use SSR instead
  // output: 'export', // Commented out to fix dynamic route issues
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable server-side features that don't work with static export
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
