import type { NextConfig } from "next";
import { POST_SLUG_REDIRECTS } from "./src/lib/post-redirects";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...POST_SLUG_REDIRECTS.map((r) => ({
        source: `/posts/${r.from}`,
        destination: `/posts/${r.to}`,
        permanent: true,
      })),
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
      allowedOrigins: ["recree.io", "dev.recree.io"],
    },
  },
  images: {
    remotePatterns: [
      {
        // Cloudflare R2 CDN
        protocol: "https",
        hostname: "cdn.recree.io",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
