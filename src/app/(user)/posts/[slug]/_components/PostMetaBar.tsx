"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { labelBackground, type ResolvedLabel } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";

interface Props {
  labels: ResolvedLabel[];
  /** 칩 줄 오른쪽 끝에 붙는 것 (좋아요 · 댓글 · 저장) */
  actions?: React.ReactNode;
}

// 토픽 · 태그 칩 줄. 오른쪽 끝에 좋아요 · 댓글 · 저장 아이콘(PostActionBar)이 붙는다.
// 칩은 .pill-badge 기본 모양(글자 12 · 위아래 3 · 좌우 8 · 화살표 12)을 비율 그대로 1.15배 키운다.
// 글자 · 여백 · 아이콘을 같은 배율로 함께 키워 모양이 뚱뚱해지지 않게 한다
const CHIP_SIZE = { "--pill-fs": "calc(0.75rem * 1.15)", "--pill-py": "calc(0.1875rem * 1.15)" } as React.CSSProperties;
const CHIP_CLASS = "whitespace-nowrap shrink-0 px-[calc(0.5rem*1.15)] gap-[calc(0.25rem*1.15)]";

export function PostMetaBar({ labels, actions }: Props) {
  return (
    // 넘치면 줄바꿈. 칩 사이(가로 7)보다 줄 사이(세로 8)를 조금 더 벌려 두 줄이 한 덩어리로 읽히게
    // 칩이 넘치면 왼쪽 칸 안에서 줄바꿈하고, 아이콘은 첫 줄 높이에 맞춰 오른쪽에 남는다
    <div className="flex items-start gap-2 px-4 pt-3 pb-2">
      <div className="flex min-w-0 flex-1 flex-wrap gap-x-[7px] gap-y-2" style={CHIP_SIZE}>
        {labels.map((label, i) =>
          label.slug ? (
            <Link key={i} href={`/topics/${label.slug}`} className="inline-flex">
              <LabelBadge
                text={label.text}
                background={labelBackground(label)}
                color={label.textColorHex}
                className={CHIP_CLASS}
              >
                <ChevronRight className="size-[calc(0.75rem*1.15)] opacity-60" />
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
      {actions}
    </div>
  );
}
