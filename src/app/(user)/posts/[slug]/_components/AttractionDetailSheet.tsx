"use client";

// ─── 관광지 상세 시트 ─────────────────────────────────────────────────────────
// 카드를 누르면 열린다. 시안에 이 화면이 없어 구조는 장소 추가 시트
// (PlaceAddSheet.tsx:503-521)의 뼈대를 따르고, 색만 포스트 상세의 시맨틱 토큰을 쓴다.
//
// 세 단계로 채운다. 목록이 이미 가진 것(사진 1장 · 이름 · 거리)을 0ms 에 그리고,
// 빠름(개요) → 중간(갤러리) → 느림(영업시간)이 도착하는 대로 덧붙는다.
// 국문 경로 카드는 번역이 붙어 마지막 단계가 최대 5초다 — 한 번에 기다리게 하지 않는다.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ExternalLink, MapPin, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { isExternalImage } from "@/lib/image";
import { TOUR_API_ATTRIBUTION } from "@/lib/tour-api/attribution";
import {
  fetchAttractionEssentials,
  fetchAttractionImages,
  fetchAttractionIntro,
} from "@/app/(user)/_actions/tour-actions";
import type {
  Attraction,
  AttractionEssentials,
  AttractionIntroRow,
} from "@/lib/tour-api/types";
import { formatDistance } from "./attraction-distance";

/** 이 길이를 넘으면 접는다. 실측 개요는 평균 273~727자에 최대 2,342자다 */
const OVERVIEW_FOLD_CHARS = 400;

type Loadable<T> = T | "failed" | null;

/** 주소만 남긴 링크 글자. www. 만 떼고 서브도메인은 남긴다 — hikr 을 지우면 어느 사이트인지 사라진다 */
function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-secondary px-4 py-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
    </div>
  );
}

/** 갤러리 — 문자열 배열만 받는 최소판. scroll-snap 이라 시트의 세로 스크롤과 다투지 않는다 */
function Gallery({ urls }: { urls: string[] }) {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || urls.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = slideRefs.current.indexOf(entry.target as HTMLDivElement);
          if (i !== -1) setActive(i);
        }
      },
      { root, threshold: 0.6 },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [urls]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 scrollbar-hide"
      >
        {urls.map((url, i) => (
          <div
            key={url}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="relative aspect-[4/3] w-[85%] flex-none snap-start overflow-hidden rounded-xl bg-muted"
          >
            <Image
              src={url}
              alt=""
              fill
              sizes="(min-width: 672px) 572px, 85vw"
              className="object-cover"
              unoptimized={isExternalImage(url)}
            />
          </div>
        ))}
      </div>
      {urls.length > 1 && (
        <div className="mt-2 flex justify-center gap-1">
          {urls.map((url, i) => (
            <span
              key={url}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-3 bg-foreground" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Overview({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const foldable = text.length > OVERVIEW_FOLD_CHARS;

  return (
    <>
      <p
        className={`whitespace-pre-line text-[13px] leading-[1.6] text-foreground ${
          foldable && !open ? "line-clamp-5" : ""
        }`}
      >
        {text}
      </p>
      {foldable && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

export function AttractionDetailSheet({
  item,
  trigger,
  meta,
  onClose,
}: {
  /** null 이면 닫힌 상태 */
  item: Attraction | null;
  /**
   * 닫을 때 포커스를 돌려줄 카드. 누른 쪽이 넘겨 준다.
   *
   * document.activeElement 로 짐작하지 않는다 — 버튼을 눌러도 브라우저가 포커스를
   * 주지 않는 경우가 있어서, 그때는 BODY 를 붙잡고 문서 맨 앞으로 튕긴다.
   */
  trigger: HTMLElement | null;
  /**
   * 거리 자리에 대신 놓을 한 줄. 축제가 쓴다 — "Now on · Sep 12 – 21".
   *
   * 시트가 Festival 타입을 알게 하지 않으려고 문자열로 받는다. 날짜·상태를 어떻게
   * 읽히게 쓸지는 목록을 가진 쪽의 판단이고, 여기는 그 한 줄을 놓을 자리만 안다.
   * 지역 목록(areaBasedList2 · searchFestival2)은 dist 를 주지 않아 거리와 겹치지 않는다.
   */
  meta?: string;
  onClose: () => void;
}) {
  const [essentials, setEssentials] = useState<Loadable<AttractionEssentials>>(null);
  const [images, setImages] = useState<Loadable<string[]>>(null);
  const [intro, setIntro] = useState<Loadable<AttractionIntroRow[]>>(null);
  const [attempt, setAttempt] = useState(0);

  /**
   * 마지막으로 연 항목. item 이 null 이 돼도 이걸 계속 그려 닫힘 애니메이션이 살아 있다.
   *
   * 항목이 바뀌면 여기서 화면을 비운다. 효과가 아니라 렌더 중에 하는 이유는 —
   * 효과로 미루면 새 항목에 옛 항목의 내용이 한 프레임 그려진다.
   */
  const [shown, setShown] = useState<Attraction | null>(null);
  /**
   * 닫히는 동안에도 돌려줄 곳이 남아 있어야 한다 — 포커스 반환은 item 이 null 이 된 뒤에
   * 일어난다. Radix 기본 반환에 맡기면 브라우저가 그 카드를 보이게 하려고 가로 스크롤을
   * 튕긴다. 20번째 카드를 열었다 닫으면 목록이 점프한다.
   */
  const [shownTrigger, setShownTrigger] = useState<HTMLElement | null>(null);
  if (item !== null && item.contentId !== shown?.contentId) {
    setShown(item);
    setShownTrigger(trigger);
    setEssentials(null);
    setImages(null);
    setIntro(null);
  }

  function retry() {
    setEssentials(null);
    setImages(null);
    setIntro(null);
    setAttempt((n) => n + 1);
  }

  // 셋을 동시에 띄우고 각자 도착하는 대로 채운다. 서로를 기다리지 않는다.
  useEffect(() => {
    if (item === null) return;
    let alive = true;

    const { contentId, contentTypeId, lang } = item;
    fetchAttractionEssentials({ contentId, lang }).then((r) => {
      if (alive) setEssentials(r ?? "failed");
    });
    fetchAttractionImages({ contentId, lang }).then((r) => {
      if (alive) setImages(r ?? "failed");
    });
    fetchAttractionIntro({ contentId, contentTypeId, lang }).then((r) => {
      if (alive) setIntro(r ?? "failed");
    });

    return () => {
      alive = false;
    };
  }, [item, attempt]);

  if (shown === null) return null;

  const essentialsFailed = essentials === "failed";
  const ess = essentials === "failed" ? null : essentials;
  const gallery = images === "failed" || images === null ? [] : images;
  const rows = intro === "failed" || intro === null ? [] : intro;

  const settled = essentials !== null && images !== null && intro !== null;
  // 실패가 아니라 "정말 아무것도 없는" 경우. 셋이 다 온 뒤에만 판정한다
  const empty =
    settled &&
    !essentialsFailed &&
    !ess?.overview &&
    !ess?.address &&
    (ess?.homepageUrls.length ?? 0) === 0 &&
    gallery.length === 0 &&
    rows.length === 0;

  const distance = formatDistance(shown.distanceM);

  return (
    <Sheet open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => {
          // 포커스는 카드로 돌려주되 스크롤은 건드리지 않는다
          e.preventDefault();
          shownTrigger?.focus({ preventScroll: true });
        }}
        className="flex max-h-[88vh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <div className="flex flex-none justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-none items-start gap-2 px-4 pb-3">
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-[15px] font-bold">{shown.title}</SheetTitle>
            {/* 시트는 훑는 화면이 아니라 읽고 행동하는 화면이다 — 국문명을 남긴다.
                목록에서 뺀 것과 판단이 다른 이유가 이것이다 */}
            {shown.titleKo && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{shown.titleKo}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-1.5 flex size-11 flex-none items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* 0단계 — 목록이 이미 가진 것. 갤러리가 오면 그 자리를 넘긴다 */}
          {gallery.length > 0 ? (
            <Gallery urls={gallery} />
          ) : (
            <div className="px-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                {shown.imageUrl ? (
                  <Image
                    src={shown.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 672px) 640px, 100vw"
                    className="object-cover"
                    unoptimized={isExternalImage(shown.imageUrl)}
                  />
                ) : (
                  <div aria-hidden className="flex h-full items-center justify-center">
                    <MapPin className="size-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          )}

          {distance && (
            <p className="px-4 pt-3 text-xs text-muted-foreground">{distance} from here</p>
          )}

          {meta && (
            <p className="px-4 pt-3 text-[13px] font-semibold text-foreground">{meta}</p>
          )}

          {essentialsFailed ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">Couldn&apos;t load details</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The tourism service isn&apos;t responding.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 h-9 rounded-full bg-muted px-4 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {ess?.address && (
                <p className="px-4 pt-3 text-[13px] leading-[1.5] text-foreground">
                  {ess.address}
                </p>
              )}

              <div className="px-4 pt-3">
                {essentials === null ? <RowSkeleton /> : null}
                {ess?.overview && <Overview text={ess.overview} />}
              </div>

              {/* 값이 다 빈 블록은 제목도 구분선도 만들지 않는다. rows 가 0개면 여기가 통째로 없다 */}
              {rows.length > 0 && (
                <div className="mt-4">
                  <Block title="Good to know">
                    <dl className="space-y-2">
                      {rows.map((row) => (
                        <div key={row.label} className="flex gap-3">
                          <dt className="w-[92px] flex-none text-xs text-muted-foreground">
                            {row.label}
                          </dt>
                          <dd className="min-w-0 flex-1 whitespace-pre-line text-[13px] leading-[1.5]">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Block>
                </div>
              )}

              {intro === null && rows.length === 0 && (
                <div className="mt-4 border-t border-secondary px-4 py-4">
                  <RowSkeleton />
                </div>
              )}

              {ess && ess.homepageUrls.length > 0 && (
                <Block title="Links">
                  <ul className="space-y-1.5">
                    {ess.homepageUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          <ExternalLink className="size-3.5 flex-none text-muted-foreground" />
                          {linkLabel(url)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {/* 실패가 아니라 정말 비어 있는 경우. 카드를 눌렀는데 아무 일도 안 일어난 것처럼
                  보이지 않게, 목록이 준 것만이라도 두고 왜 더 없는지 말한다 */}
              {empty && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No additional details available
                </p>
              )}
            </>
          )}

          <p className="px-4 pb-2 pt-5 text-[10.5px] font-medium text-muted-foreground">
            {TOUR_API_ATTRIBUTION}
          </p>
        </div>

        <div
          className="flex-none"
          style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        />
      </SheetContent>
    </Sheet>
  );
}
