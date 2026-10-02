"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { labelBackground, type ResolvedLabel } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

interface Props {
  labels: ResolvedLabel[];
}

// 토픽 · 태그 칩. 모바일에서 같은 줄 오른쪽의 댓글 · 저장(PostActionBar)은 page 의 격자가 옆에 나란히 놓는다 —
// 서버에서 만든 요소를 이 클라이언트 컴포넌트에 prop 으로 넘기면 React 가 key 경고를 내서다.
// 칩은 .pill-badge 기본 모양(글자 12 · 위아래 3 · 좌우 8 · 화살표 12)을 비율 그대로 키운다 — 모바일 1.15배, lg 1.3배(글자 약 15.6).
// 글자 · 여백 · 아이콘을 같은 배율(--chip-scale)로 함께 키워 모양이 뚱뚱해지지 않게 한다
const CHIP_SIZE = {
  "--pill-fs": "calc(0.75rem * var(--chip-scale))",
  "--pill-py": "calc(0.1875rem * var(--chip-scale))",
} as React.CSSProperties;
const CHIP_CLASS = "whitespace-nowrap shrink-0 px-[calc(0.5rem*var(--chip-scale))] gap-[calc(0.25rem*var(--chip-scale))]";

export function PostMetaBar({ labels }: Props) {
  return (
    // 넘치면 이 칸 안에서 줄바꿈. 칩 사이(가로 7)보다 줄 사이(세로 8)를 조금 더 벌려 두 줄이 한 덩어리로 읽히게
    <div className="flex min-w-0 flex-1 flex-wrap gap-x-[7px] gap-y-2 [--chip-scale:1.15] lg:[--chip-scale:1.3]" style={CHIP_SIZE}>
      {labels.map((label, i) =>
        label.slug ? (
          <Link key={i} href={`/topics/${label.slug}`} className="inline-flex">
            <LabelBadge
              text={label.text}
              background={labelBackground(label)}
              color={label.textColorHex}
              className={CHIP_CLASS}
            >
              <ChevronRight className="size-[calc(0.75rem*var(--chip-scale))] opacity-60" />
            </LabelBadge>
          </Link>
        ) : (
          <LabelBadge
            key={i}
            text={label.text}
            background={labelBackground(label)}
            color={label.textColorHex}
            className={CHIP_CLASS}
          />
        )
      )}
    </div>
  );
}
