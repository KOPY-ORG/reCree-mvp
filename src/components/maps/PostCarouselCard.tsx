"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { isExternalImage } from "@/lib/image";
import type { MapPost } from "@/lib/map-queries";
import {
  labelBackground,
  selectCardLabels,
  type TagGroupColorMap,
} from "@/lib/post-labels";
import type { PlaceTypeLink } from "@/lib/place-types";
import { LabelBadge } from "@/components/LabelBadge";
import { ScrapButton } from "@/app/(user)/_components/ScrapButton";

interface Props {
  post: MapPost;
  isSaved: boolean;
  tagGroupMap: TagGroupColorMap;
  /** 이 카드가 떠 있는 장소의 타입 — 팬 맥락 태그가 없을 때 대표 타입으로 폴백한다 */
  placeTypes?: readonly PlaceTypeLink[];
}

export function PostCarouselCard({ post, isSaved, tagGroupMap, placeTypes }: Props) {
  const [localSaved, setLocalSaved] = useState(isSaved);
  const cardImageUrl = post.imageUrl ?? post.images[0] ?? null;

  const labels = selectCardLabels(
    { topics: post.topics, tags: post.tags, placeTypes, tagGroupMap },
    "home",
  );

  return (
    <Link
      href={`/posts/${post.slug}`}
      className="block w-full rounded-xl overflow-hidden bg-muted"
    >
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
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
        <div className={`absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full shadow ${localSaved ? "bg-[#D3FD52]" : "bg-white"}`}>
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
