import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import {
  resolveTagColors,
  labelBackground,
  buildTopicSlots,
  selectCardLabels,
  selectShopLabels,
  type LabelSlot,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import type { PlaceTypeLink } from "@/lib/place-types";
import { LabelBadge } from "@/components/LabelBadge";
import type { PostItem } from "@/lib/post-queries";
import { SHOP_TAG_GROUPS } from "../shop/_constants";
import { ScrapButton } from "./ScrapButton";

/**
 * PostBadges가 필요로 하는 최소 형태 — PostItem뿐 아니라 동일 shape의 ShopPostItem 등도 재사용 가능.
 * topic.level은 shop variant 전용(멤버 우선 선택)이며 optional — level 없는 post(PostItem)도 그대로 수용.
 */
export type LabelablePost = {
  postTopics: (Omit<PostItem["postTopics"][number], "topic"> & {
    topic: PostItem["postTopics"][number]["topic"] & { level?: number };
  })[];
  // tag.slug 는 optional 이다 — shop 쿼리(getShopPosts·getShopPostsWithLabels)는 slug 를 안 뽑는다.
  // shop variant 는 BEAUTY/ITEM 태그만 보므로 팬 맥락 식별이 필요 없다.
  postTags: (Omit<PostItem["postTags"][number], "tag"> & {
    tag: Omit<PostItem["postTags"][number]["tag"], "slug"> & { slug?: string };
  })[];
  /** 팬 맥락 태그가 없을 때 대표 장소 타입으로 폴백한다. 없으면 폴백 없이 태그만 */
  postPlaces?: { place: { placePlaceTypes?: readonly PlaceTypeLink[] } }[];
};

function resolvePostLabels(
  post: LabelablePost,
  tagGroupMap: TagGroupColorMap,
  variant: "home" | "list" | "shop",
): ResolvedLabel[] {
  // shop variant — 멤버 우선 토픽 1 + BEAUTY/ITEM 태그 1. 새 규칙 밖이라 그대로 둔다.
  // 태그 슬롯 displayLabel은 null로 둬 그룹 표시명("Item") 치환을 막고 태그 본래 이름을 쓴다.
  if (variant === "shop") {
    // 슬롯 조립은 공용 함수로 — 링크 slug 규칙(level 2 토픽만)을 여기서도 그대로 쓴다
    const topicSlots: LabelSlot[] = buildTopicSlots(post.postTopics.map(({ topic }) => topic));
    const tagSlots: LabelSlot[] = post.postTags.map(({ tag }) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: null, colors: resolveTagColors(tag, gc) };
    });
    return selectShopLabels(topicSlots, tagSlots, SHOP_TAG_GROUPS);
  }

  return selectCardLabels(
    {
      topics: post.postTopics.map(({ topic }) => topic),
      tags: post.postTags.map(({ tag }) => tag),
      placeTypes: post.postPlaces?.[0]?.place.placePlaceTypes,
      tagGroupMap,
    },
    variant,
  );
}

export function PostBadges({
  post,
  tagGroupMap,
  variant = "home",
  pillFontSize = "0.625rem",
  className = "flex flex-wrap gap-1",
}: {
  post: LabelablePost;
  tagGroupMap: TagGroupColorMap;
  variant?: "home" | "list" | "shop";
  pillFontSize?: string;
  className?: string;
}) {
  const labels = resolvePostLabels(post, tagGroupMap, variant);
  if (labels.length === 0) return null;

  return (
    <div
      className={className}
      style={{ "--pill-fs": pillFontSize } as React.CSSProperties}
    >
      {labels.map((label, i) => (
        <LabelBadge
          key={i}
          text={label.text}
          background={labelBackground(label)}
          color={label.textColorHex}
        />
      ))}
    </div>
  );
}

export function PostCard({
  post,
  tagGroupMap,
  isSaved,
  variant = "carousel",
  priority = false,
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved?: boolean;
  variant?: "carousel" | "grid";
  priority?: boolean;
}) {
  const wrapperClass =
    variant === "carousel" ? "snap-start shrink-0 w-[160px] md:w-[200px]" : "";
  const imageSizes =
    variant === "carousel" ? "200px" : "(max-width: 672px) 50vw, 336px";

  return (
    <Link href={`/posts/${post.slug}`} className={wrapperClass}>
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
        {post.postImages[0]?.url ? (
          <Image
            src={post.postImages[0].url}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(post.postImages[0].url)}
            className="object-cover"
            style={focalStyle(post.postImages[0].focalX, post.postImages[0].focalY, post.postImages[0].zoom)}
            sizes={imageSizes}
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 right-2">
          <PostBadges post={post} tagGroupMap={tagGroupMap} />
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-end gap-1.5">
          <p className="flex-1 text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow min-w-0">
            {post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo ?? post.titleEn}
          </p>
          <div className="shrink-0 z-10">
            <ScrapButton postId={post.id} initialSaved={isSaved ?? false} size="sm" unsavedClassName="text-white/80 hover:text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
