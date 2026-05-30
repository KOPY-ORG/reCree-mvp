"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isExternalImage } from "@/lib/image";
import type { MapPost } from "@/lib/map-queries";
import {
  resolveTagColors,
  resolveTopicColors,
  labelBackground,
  K_MEDIA_GROUP,
  selectHomeLabels,
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

export function PostCarouselCard({ post, isSaved, tagGroupMap }: Props) {
  const [localSaved, setLocalSaved] = useState(isSaved);
  const cardImageUrl = post.imageUrl ?? post.images[0] ?? null;

  const topicSlots: LabelSlot[] = post.topics.map((topic) => ({
    group: "TOPIC",
    name: topic.nameEn,
    displayLabel: null,
    colors: resolveTopicColors(topic),
  }));
  const otherSlots: LabelSlot[] = post.tags
    .filter((tag) => tag.group !== K_MEDIA_GROUP)
    .map((tag) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: gc?.displayLabel ?? null, colors: resolveTagColors(tag, gc) };
    });
  const labels = selectHomeLabels(topicSlots, otherSlots);

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="block w-full rounded-xl overflow-hidden bg-muted"
    >
      {/* 이전 카드 전체 높이(썸네일 2/1 + 제목 52px)와 동일한 높이를 유지 */}
      <div className="relative w-full">
        <div style={{ aspectRatio: "2/1" }} />
        <div className="h-[52px]" />
        {cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(cardImageUrl)}
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        {/* 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        {/* 레이블 + 제목 — 좌하단 */}
        <div className="absolute bottom-3 left-2.5 right-10 flex flex-col gap-1">
          {labels.length > 0 && (
            <div className="flex gap-1 flex-wrap [--pill-fs:0.625rem]">
              {labels.map((label, i) => (
                <LabelBadge key={i} text={label.text} background={labelBackground(label)} color={label.textColorHex} />
              ))}
            </div>
          )}
          <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-white drop-shadow">
            {post.titleEn}
          </p>
        </div>
        {/* 스크랩 버튼 — 우상단 */}
        <div className={`absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full shadow ${localSaved ? "bg-[#C8FF09]" : "bg-white"}`}>
          <ScrapButton
            postId={post.id}
            initialSaved={isSaved}
            size="sm"
            savedStyle={{ fill: "black", stroke: "black" }}
            onSaveChange={setLocalSaved}
          />
        </div>
      </div>
    </Link>
  );
}
