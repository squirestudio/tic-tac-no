import type { NextConfig } from "next";

const isMobile = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  ...(isMobile && {
    output: 'export',
    trailingSlash: true,
  }),
};

export default nextConfig;
