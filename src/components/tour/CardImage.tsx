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

export function CardImage({ url, children }: { url: string | null; children?: React.ReactNode }) {
  return (
    <div className="relative">
      {url ? (
        /* unoptimized 판정은 C-3b 와 같다 — 등록되지 않은 호스트를 next/image 에
           그대로 넘기면 이미지 하나가 아니라 페이지가 죽는다 */
        <Image
          src={url}
          alt=""
          width={140}
          height={105}
          unoptimized={isExternalImage(url)}
          className="aspect-[4/3] w-full rounded-xl bg-muted object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted"
        >
          <MapPin className="size-5 text-muted-foreground" />
        </div>
      )}
      {children}
    </div>
  );
}
