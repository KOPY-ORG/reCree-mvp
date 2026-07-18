import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { resolveTagColors, labelBackground, type TagGroupColorMap } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import type { ShopPostItem } from "@/lib/post-queries";

export function ShopCard({
  post,
  tagGroupMap,
}: {
  post: ShopPostItem;
  tagGroupMap: TagGroupColorMap;
}) {
  const thumbnail = post.postImages[0];
  const visibleTags = post.postTags.filter(({ isVisible }) => isVisible).slice(0, 2);

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

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visibleTags.map(({ tag }) => {
              const colors = resolveTagColors(tag, tagGroupMap.get(tag.group));
              return (
                <LabelBadge
                  key={tag.id}
                  text={tag.name}
                  background={labelBackground({ text: tag.name, ...colors })}
                  color={colors.textColorHex}
                />
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
