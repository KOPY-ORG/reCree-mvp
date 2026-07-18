export const SHOP_TAG_GROUPS = ["BEAUTY", "ITEM"] as const;
export type ShopTagGroup = (typeof SHOP_TAG_GROUPS)[number];

export const SHOP_GROUP_LABELS: Record<ShopTagGroup, string> = {
  BEAUTY: "K-Beauty",
  ITEM: "K-Item",
};
