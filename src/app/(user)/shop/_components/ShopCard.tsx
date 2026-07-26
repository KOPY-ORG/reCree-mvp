import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { type TagGroupColorMap } from "@/lib/post-labels";
import { PostBadges } from "../../_components/PostCard";
import type { ShopPostItem } from "@/lib/post-queries";

export function ShopCard({
  post,
  tagGroupMap,
}: {
  post: ShopPostItem;
  tagGroupMap: TagGroupColorMap;
}) {
  const thumbnail = post.postImages[0];

  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
        {thumbnail?.url ? (
          <Image
            src={thumbnail.url}
            alt={post.subtitle ?? post.titleEn}
            fill
            unoptimized={isExternalImage(thumbnail.url)}
            className="object-cover"
            style={focalStyle(thumbnail.focalX, thumbnail.focalY, thumbnail.zoom)}
            sizes="(max-width: 672px) 50vw, 336px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="pt-2 space-y-1">
        {post.subtitle ? (
          <>
            <p className="text-sm font-bold line-clamp-1">{post.subtitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{post.titleEn}</p>
          </>
        ) : (
          <p className="text-sm font-bold line-clamp-1">{post.titleEn}</p>
        )}

        <PostBadges
          post={{
            postTopics: post.postTopics,
            postTags: post.postTags.filter(({ isVisible }) => isVisible),
          }}
          tagGroupMap={tagGroupMap}
          variant="shop"
          className="flex flex-wrap gap-1 pt-0.5"
        />
      </div>
    </Link>
  );
}
