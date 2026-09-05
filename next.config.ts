import type { NextConfig } from "next";
import { POST_SLUG_REDIRECTS } from "./src/lib/post-redirects";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/discover/hall/:path*", destination: "/recreeshot/:path*", permanent: true },
      { source: "/explore/hall/:path*", destination: "/recreeshot/:path*", permanent: true },
      { source: "/explore", destination: "/discover", permanent: true },
      { source: "/my-map", destination: "/discover", permanent: false },
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
        // 한국관광공사 OpenAPI 이미지 (firstimage / firstimage2).
        // 실측 470건 전부 이 호스트 하나다 (prisma/scripts/tour-api-spike*-result.json).
        // API는 http로도 내려주지만 액션에서 https로 정규화해 넘긴다.
        protocol: "https",
        hostname: "tong.visitkorea.or.kr",
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
