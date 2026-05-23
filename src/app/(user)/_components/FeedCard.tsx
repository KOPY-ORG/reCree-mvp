import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { focalStyle, isExternalImage } from "@/lib/image";
import { type TagGroupColorMap } from "@/lib/post-labels";
import type { PostItem } from "@/lib/post-queries";
import { PostBadges } from "./PostCard";
import { ScrapButton } from "./ScrapButton";

export function FeedCard({
  post,
  tagGroupMap,
  isSaved,
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved?: boolean;
}) {
  const placeName =
    post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo;

  return (
    <Link href={`/posts/${post.slug}`} className="block">
      <div className="flex flex-col gap-2">
        {/* 사진 */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          {post.postImages[0]?.url ? (
            <Image
              src={post.postImages[0].url}
              alt={post.titleEn}
              fill
              unoptimized={isExternalImage(post.postImages[0].url)}
              className="object-cover"
              style={focalStyle(
                post.postImages[0].focalX,
                post.postImages[0].focalY,
                post.postImages[0].zoom,
              )}
              sizes="(max-width: 672px) 100vw, 672px"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>

        {/* 칩 + 북마크 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <PostBadges post={post} tagGroupMap={tagGroupMap} variant="list" pillFontSize="0.75rem" />
          </div>
          <ScrapButton postId={post.id} initialSaved={isSaved ?? false} size="md" />
        </div>

        {/* 제목 */}
        <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground">
          {post.titleEn}
        </h3>

        {/* 장소명 */}
        {placeName && (
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="line-clamp-1 font-medium">{placeName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
