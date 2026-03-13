import Link from "next/link";
import Image from "next/image";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import type { PostItem } from "@/lib/post-queries";
import { ScrapButton } from "./ScrapButton";

function resolvePostLabels(
  post: PostItem,
  tagGroupMap: TagGroupColorMap,
  variant: "home" | "list",
): ResolvedLabel[] {
  const topics = post.postTopics
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(({ topic }) => ({ text: topic.nameEn, ...resolveTopicColors(topic) }));
  const tags = post.postTags
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(({ tag }) => ({ text: tag.name, ...resolveTagColors(tag, tagGroupMap.get(tag.group)) }));

  if (variant === "home") return [...topics.slice(0, 1), ...tags.slice(0, 1)];
  return [...topics.slice(0, 1), ...tags.slice(0, 2)];
}

export function PostBadges({
  post,
  tagGroupMap,
  variant = "home",
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  variant?: "home" | "list";
}) {
  const labels = resolvePostLabels(post, tagGroupMap, variant);
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
