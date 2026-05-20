import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://recree.io";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/discover`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/category`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/policy/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/policy/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  // /posts/[slug] — PUBLISHED 상태만
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // /discover/hall/[id] — ACTIVE 상태만
  const shots = await prisma.reCreeshot.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, updatedAt: true },
  });

  const hallRoutes: MetadataRoute.Sitemap = shots.map((shot) => ({
    url: `${BASE_URL}/discover/hall/${shot.id}`,
    lastModified: shot.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...hallRoutes];
}
