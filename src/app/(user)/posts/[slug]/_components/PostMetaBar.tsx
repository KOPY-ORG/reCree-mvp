"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { labelBackground, type ResolvedLabel } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

interface Props {
  labels: ResolvedLabel[];
}

// 토픽 · 태그 칩 줄. 공유 · 저장은 사진 위(PostDetailHeader)로 옮겼다.
// 칩은 .pill-badge 그대로에 크기만 한 단계 키운다 — 홈 토픽 칩(h-8, 15px)에 가깝게 14px · 높이 30
const CHIP_SIZE = { "--pill-fs": "var(--text-sm)", "--pill-py": "0.5rem" } as React.CSSProperties;

export function PostMetaBar({ labels }: Props) {
  return (
    // 넘치면 줄바꿈. 칩 사이(가로 6)보다 줄 사이(세로 8)를 조금 더 벌려 두 줄이 한 덩어리로 읽히게
    <div className="px-4 pt-3 pb-2">
      <div className="flex flex-wrap gap-x-1.5 gap-y-2" style={CHIP_SIZE}>
        {labels.map((label, i) =>
          label.slug ? (
            <Link key={i} href={`/topics/${label.slug}`} className="inline-flex">
              <LabelBadge
                text={label.text}
                background={labelBackground(label)}
                color={label.textColorHex}
                className="whitespace-nowrap shrink-0 px-3"
              >
                <ChevronRight className="size-3.5 opacity-60" />
              </LabelBadge>
            </Link>
          ) : (
            <LabelBadge
              key={i}
              text={label.text}
              background={labelBackground(label)}
              color={label.textColorHex}
              className="whitespace-nowrap shrink-0 px-3"
            />
          )
        )}
      </div>
    </div>
  );
}
