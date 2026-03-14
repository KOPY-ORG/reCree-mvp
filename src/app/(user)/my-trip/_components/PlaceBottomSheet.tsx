"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, resolveTagColors, type TagGroupColorMap } from "@/lib/post-labels";
import type { MapPlace } from "@/lib/map-queries";
import { ScrapButton } from "../../_components/ScrapButton";

interface Props {
  place: MapPlace | null;
  savedPostIds: Set<string>;
  tagGroupMap: TagGroupColorMap;
  onClose: () => void;
}

export function PlaceBottomSheet({ place, savedPostIds, tagGroupMap, onClose }: Props) {
  return (
    <Sheet open={!!place} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="rounded-t-2xl max-h-[70vh] p-0 flex flex-col gap-0"
      >
        <SheetTitle className="sr-only">{place?.nameEn}</SheetTitle>

        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        {/* 장소 헤더 */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-bold">{place?.nameEn}</p>
              {place?.nameKo && place.nameKo !== place.nameEn && (
                <p className="text-xs text-muted-foreground mt-0.5">{place.nameKo}</p>
              )}
            </div>
            {place?.rating != null && (
              <div className="flex items-center gap-1 text-sm shrink-0">
                <Star className="size-3.5 fill-brand stroke-brand" />
                <span className="font-semibold">{place.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          {place && place.posts.length > 1 && (
            <p className="text-xs text-muted-foreground mt-1">{place.posts.length} posts</p>
          )}
        </div>

        {/* 포스트 목록 */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          {place?.posts.map((post) => {
            const isSaved = savedPostIds.has(post.id);
            return (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/posts/${post.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative size-[72px] shrink-0 rounded-lg overflow-hidden bg-muted">
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt={post.titleEn}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2 leading-snug">{post.titleEn}</p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 [--pill-fs:0.625rem]">
                        {post.tags.slice(0, 2).map((tag) => {
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
                <ScrapButton postId={post.id} initialSaved={isSaved} size="md" />
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
