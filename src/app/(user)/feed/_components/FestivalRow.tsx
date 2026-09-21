"use client";

// ─── 홈 축제 줄 ───────────────────────────────────────────────────────────────
// FestivalSection(서버)이 조회한 목록을 받아 그리고, 카드를 누르면 상세 시트를 연다.
//
// 이 한 겹이 있는 이유는 "어느 축제를 눌렀는가" 가 상태이기 때문이다. 조회는 서버에
// 남기고 상태만 여기로 내린다 — 목록을 클라이언트에서 다시 받아 오지 않는다.
//
// discover 지역 섹션(RegionTourSections.tsx:303-335)과 같은 길이다. 시트도 변환도
// 같은 것을 쓴다. 홈에 지도가 없다는 것 말고는 다를 이유가 없다.

import { useState } from "react";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { FestivalCard } from "@/components/tour/FestivalCard";
import { festivalSheetProps } from "@/components/tour/festival-detail";
import { AttractionDetailSheet } from "@/app/(user)/posts/[slug]/_components/AttractionDetailSheet";
import type { CardAspect } from "@/components/tour/CardImage";
import type { Attraction, Festival } from "@/lib/tour-api/types";

export function FestivalRow({ title, festivals }: { title: string; festivals: Festival[] }) {
  /**
   * 시트는 줄 전체가 하나만 쓴다 — 카드마다 두면 Dialog 가 열 개 넘게 마운트된다
   * (RegionTourSections.tsx:211 과 같은 판단).
   *
   * 변환 결과를 그대로 담는다. 렌더 중에 다시 만들면 item 이 매 렌더 새 객체라
   * 시트가 TourAPI 를 끝없이 다시 부른다 (festival-detail.ts 의 festivalSheetProps 주석).
   */
  const [selected, setSelected] = useState<{
    item: Attraction;
    meta: string;
    imageAspect: CardAspect;
    trigger: HTMLElement;
  } | null>(null);

  return (
    <>
      {/* moreHref 를 넘기지 않는다 — 축제 전체 목록 화면이 없다 */}
      <HScrollSection title={title}>
        {festivals.map((festival) => (
          <FestivalCard
            key={festival.contentId}
            item={festival}
            // trigger 를 같이 받는 것은 시트가 닫힐 때 포커스를 그 카드로 되돌려야 해서다.
            // 안 돌려주면 브라우저가 문서 맨 앞으로 튕긴다 (AttractionDetailSheet.tsx:203-208)
            onSelect={(picked, trigger) => setSelected({ ...festivalSheetProps(picked), trigger })}
          />
        ))}
      </HScrollSection>

      <AttractionDetailSheet
        item={selected?.item ?? null}
        trigger={selected?.trigger ?? null}
        meta={selected?.meta}
        imageAspect={selected?.imageAspect}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
