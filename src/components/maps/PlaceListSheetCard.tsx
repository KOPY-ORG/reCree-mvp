"use client";

import Image from "next/image";
import Link from "next/link";
import { isExternalImage } from "@/lib/image";
import type { MapPost } from "@/lib/map-queries";
import {
  resolveTagColors,
  resolveTopicColors,
  labelBackground,
  K_MEDIA_GROUP,
  selectListLabels,
  type LabelSlot,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";

interface Props {
  post: MapPost;
  isSaved: boolean;
  tagGroupMap: TagGroupColorMap;
}

export function PlaceListSheetCard({ post, isSaved, tagGroupMap }: Props) {
  const cardImageUrl = post.imageUrl ?? post.images[0] ?? null;

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex gap-3 items-center bg-white border border-border/40 rounded-2xl px-3 py-3 active:opacity-70 transition-opacity"
    >
      {/* 썸네일 */}
      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted">
        {cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(cardImageUrl)}
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold line-clamp-2 mb-1.5">{post.titleEn}</h3>
        {(() => {
          const topicSlots: LabelSlot[] = post.topics.map((topic) => ({
            group: "TOPIC", name: topic.nameEn, displayLabel: null, colors: resolveTopicColors(topic),
          }));
          const kmediaSlots: LabelSlot[] = post.tags
            .filter((t) => t.group === K_MEDIA_GROUP)
            .map((t) => ({ group: t.group, name: t.name, displayLabel: null, colors: resolveTagColors(t, tagGroupMap.get(t.group)) }));
          const otherSlots: LabelSlot[] = post.tags
            .filter((t) => t.group !== K_MEDIA_GROUP)
            .map((t) => ({ group: t.group, name: t.name, displayLabel: tagGroupMap.get(t.group)?.displayLabel ?? null, colors: resolveTagColors(t, tagGroupMap.get(t.group)) }));
          const labels = selectListLabels(topicSlots, kmediaSlots, otherSlots);
          if (labels.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1 [--pill-fs:0.625rem]">
              {labels.map((label, i) => (
                <LabelBadge key={i} text={label.text} background={labelBackground(label)} color={label.textColorHex} />
              ))}
            </div>
          );
        })()}
      </div>

      {/* 북마크 */}
      <ScrapButton postId={post.id} initialSaved={isSaved} size="md" />
    </Link>
  );
}
