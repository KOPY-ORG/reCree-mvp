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
    <Link href={`/posts/${post.slug}`}>
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
      <div className="mt-2.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <PostBadges post={post} tagGroupMap={tagGroupMap} variant="list" />
            {placeName && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{placeName}</span>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <ScrapButton postId={post.id} initialSaved={isSaved ?? false} size="md" />
          </div>
        </div>
        <h3 className="text-base font-semibold leading-snug line-clamp-2 text-foreground">
          {post.titleEn}
        </h3>
      </div>
    </Link>
  );
}
