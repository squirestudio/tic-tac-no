import type { NextConfig } from "next";

const isMobile = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
  ...(isMobile && {
    output: 'export',
    trailingSlash: true,
  }),
};

export default nextConfig;
