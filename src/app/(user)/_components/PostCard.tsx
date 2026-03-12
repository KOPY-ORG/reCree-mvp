import Link from "next/link";
import Image from "next/image";
import {
  resolveTopicColors,
  labelBackground,
  DEFAULT_COLOR,
  DEFAULT_TEXT,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import type { PostItem } from "@/lib/post-queries";
import { ScrapButton } from "./ScrapButton";

function resolvePostLabels(post: PostItem, tagGroupMap: TagGroupColorMap): ResolvedLabel[] {
  const labels: ResolvedLabel[] = [];

  for (const { topic } of post.postTopics) {
    labels.push({ text: topic.nameEn, ...resolveTopicColors(topic) });
  }
  for (const { tag } of post.postTags) {
    const gc = tagGroupMap.get(tag.group);
    labels.push({
      text: tag.name,
      colorHex: tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
      colorHex2: tag.colorHex ? (tag.colorHex2 ?? null) : (gc?.colorHex2 ?? null),
      gradientDir: gc?.gradientDir ?? "to bottom",
      gradientStop: gc?.gradientStop ?? 150,
      textColorHex: tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
    });
  }

  return labels;
}

export function PostBadges({
  post,
  tagGroupMap,
  maxLabels = 2,
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  maxLabels?: number;
}) {
  const labels = resolvePostLabels(post, tagGroupMap).slice(0, maxLabels);
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label, i) => (
        <span
          key={i}
          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
          style={{ background: labelBackground(label), color: label.textColorHex }}
        >
          {label.text}
        </span>
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
      <div className="relative aspect-[3/2] rounded-lg overflow-hidden bg-muted">
        {post.postImages[0]?.url ? (
          <Image
            src={post.postImages[0].url}
            alt={post.titleEn}
            fill
            unoptimized
            className="object-cover"
            sizes={imageSizes}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 right-2">
          <PostBadges post={post} tagGroupMap={tagGroupMap} />
        </div>
        <div className="absolute bottom-2 left-2 right-10">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
            {post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo ?? post.titleEn}
          </p>
        </div>
        <div className="absolute bottom-2 right-2 z-10">
          <ScrapButton postId={post.id} initialSaved={isSaved ?? false} size="sm" />
        </div>
      </div>
    </Link>
  );
}
