// ─── 관광 카드의 공통 껍데기 ──────────────────────────────────────────────────
// discover 지역 섹션의 관광지·축제 카드가 같이 쓰던 것을 그대로 옮긴 것이다
// (RegionTourSections.tsx:31-33, :127-152).
//
// 축제 카드가 홈으로도 나가면서 이 셋이 두 모듈에 걸치게 됐다. 축제 쪽에 복사해
// 두면 카드 치수가 화면마다 조용히 갈라지므로 한 벌만 남긴다 —
// 관광지 카드는 discover 에 남고, 여기서 이 셋을 가져다 쓴다.
//
// "use client" 를 달지 않는다. 훅이 없어 서버 컴포넌트 안에서도 그대로 그려진다.

import Image from "next/image";
import { MapPin } from "lucide-react";
import { isExternalImage } from "@/lib/image";

/** C-3b 와 같은 값 — 한 서비스 안에서 관광지 카드는 어디서나 같은 크기다 */
export const CARD_W = "w-[140px]";
export const TEXT_H = "h-[52px]";

/**
 * 사진 비율. 문자열을 조립하지 않고 표로 두는 이유는 Tailwind 가 소스에 그대로 적힌
 * 클래스만 보기 때문이다 — `aspect-[${r}]` 로 만들면 그 클래스가 생성되지 않는다.
 *
 * 비율마다 next/image 에 줄 intrinsic 크기를 같이 적는다. 비율 하나를 카드 한 종류가
 * 쓰고 있어 폭이 곧 그 카드의 폭이다. 렌더 크기는 CSS 가 정하고, 이 숫자는 srcset 용이다.
 *
 *   4/3  관광지 · 주변 관광지. 대표사진이 대부분 가로다
 *   3/4  축제. 실측(서울 진행중 12건 표본) w/h 중앙값이 0.750 으로 정확히 3/4 였다.
 *        세로 7건이 0.707~0.750 에 몰려 있고, 4/3 으로 담으면 포스터 제목이 잘려 나간다
 */
const ASPECT = {
  "4/3": { cls: "aspect-[4/3]", w: 140, h: 105 },
  "3/4": { cls: "aspect-[3/4]", w: 160, h: 213 },
} as const;

export type CardAspect = keyof typeof ASPECT;

/**
 * 비율 클래스만 꺼낸다. 상세 시트처럼 next/image 를 fill 로 채워
 * intrinsic 크기가 필요 없는 곳이 쓴다 — 카드와 시트가 같은 비율을 말하게 하려는 것이다.
 */
export function aspectClass(aspect: CardAspect): string {
  return ASPECT[aspect].cls;
}

export function CardImage({
  url,
  aspect = "4/3",
  fallback = "pin",
  children,
}: {
  url: string | null;
  /** 기본값이 기존 값이라 넘기지 않는 카드는 달라지지 않는다 */
  aspect?: CardAspect;
  /**
   * 사진이 없을 때 그 자리에 무엇을 둘지.
   *
   *   pin    회색 상자에 핀 하나. 관광지 카드가 쓰던 그대로다
   *   brand  브랜드 라임 그라데이션. 세로형은 빈 자리가 카드 높이의 4분의 3이라
   *          회색 상자 하나가 그 자리를 다 먹는다 — 색으로 채워 카드로 보이게 한다
   */
  fallback?: "pin" | "brand";
  children?: React.ReactNode;
}) {
  const { cls, w, h } = ASPECT[aspect];

  return (
    <div className="relative">
      {url ? (
        /* unoptimized 판정은 C-3b 와 같다 — 등록되지 않은 호스트를 next/image 에
           그대로 넘기면 이미지 하나가 아니라 페이지가 죽는다 */
        <Image
          src={url}
          alt=""
          width={w}
          height={h}
          unoptimized={isExternalImage(url)}
          className={`${cls} w-full rounded-xl bg-muted object-cover`}
        />
      ) : fallback === "brand" ? (
        /* 글자를 얹지 않는다. 카드 바로 아래가 제목이라 같은 글자가 두 번 나온다.
           대각선(좌상→우하)인 것은 세로 상자에서 수직 그라데이션이 띠처럼 보여서다 */
        <div
          aria-hidden
          className={`${cls} w-full rounded-xl bg-gradient-to-br from-brand via-brand-sub2 to-brand-sub3`}
        />
      ) : (
        <div aria-hidden className={`flex ${cls} w-full items-center justify-center rounded-xl bg-muted`}>
          <MapPin className="size-5 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}
