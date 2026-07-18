import { prisma } from "@/lib/prisma";
import { getShopPosts } from "@/lib/post-queries";
import { SHOP_TAG_GROUPS } from "./_constants";
import { ShopClient } from "./_components/ShopClient";

export default async function ShopPage() {
  const [posts, shopTags, tagGroupConfigs] = await Promise.all([
    getShopPosts(),
    prisma.tag.findMany({
      where: { group: { in: [...SHOP_TAG_GROUPS] }, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, group: true },
    }),
    prisma.tagGroupConfig.findMany({
      where: { group: { in: [...SHOP_TAG_GROUPS] } },
      select: {
        group: true,
        displayLabel: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
      },
    }),
  ]);

  return <ShopClient posts={posts} shopTags={shopTags} tagGroupConfigs={tagGroupConfigs} />;
}
