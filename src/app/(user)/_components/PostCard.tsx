import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  K_MEDIA_GROUP,
  selectHomeLabels,
  selectListLabels,
  type LabelSlot,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import type { PostItem } from "@/lib/post-queries";
import { ScrapButton } from "./ScrapButton";

function resolvePostLabels(
  post: PostItem,
  tagGroupMap: TagGroupColorMap,
  variant: "home" | "list",
): ResolvedLabel[] {
  const topicSlots: LabelSlot[] = post.postTopics.map(({ topic }) => ({
    group: "TOPIC",
    name: topic.nameEn,
    displayLabel: null,
    colors: resolveTopicColors(topic),
    slug: topic.slug,
  }));

  const kmediaSlots: LabelSlot[] = post.postTags
    .filter(({ tag }) => tag.group === K_MEDIA_GROUP)
    .map(({ tag }) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: null, colors: resolveTagColors(tag, gc) };
    });

  const otherSlots: LabelSlot[] = post.postTags
    .filter(({ tag }) => tag.group !== K_MEDIA_GROUP)
    .map(({ tag }) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: gc?.displayLabel ?? null, colors: resolveTagColors(tag, gc) };
    });

  return variant === "home"
    ? selectHomeLabels(topicSlots, otherSlots)
    : selectListLabels(topicSlots, kmediaSlots, otherSlots);
}

export function PostBadges({
  post,
  tagGroupMap,
  variant = "home",
  pillFontSize = "0.625rem",
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  variant?: "home" | "list";
  pillFontSize?: string;
}) {
  const labels = resolvePostLabels(post, tagGroupMap, variant);
  if (labels.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-1"
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
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved?: boolean;
  variant?: "carousel" | "grid";
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
