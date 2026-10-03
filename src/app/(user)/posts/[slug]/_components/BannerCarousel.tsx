"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { ImageIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

interface BannerImage {
  id: string;
  url: string;
  sortOrder: number;
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
}

interface Props {
  images: BannerImage[];
  children?: React.ReactNode;
  /**
   * lg 모양. 모바일 · md 는 어느 쪽이든 지금의 4:3 한 장씩 캐러셀이다.
   * - "media": 왼쪽 열 맨 위 16:9 미디어 칸 (유튜브 출처가 없는 글)
   * - "strip": 유튜브 영상 아래 가로 사진 줄. 약 2.5장이 보이고 화살표로 한 장씩 넘긴다 (유튜브 출처가 있는 글)
   * - "column": 인스타그램 · X 임베드 오른쪽 세로 사진 줄. 높이는 미디어 줄의 --social-media-h, 위아래 화살표로 한 장씩 넘긴다
   */
  lgLayout?: "media" | "strip" | "column";
}

/** lg 판정 — 화살표가 한 장씩 넘길지(모바일 캐러셀), 줄을 스크롤할지(lg strip) 정한다. globals.css 의 lg(64rem)와 같은 값 */
const LG_QUERY = "(min-width: 64rem)";

export function BannerCarousel({ images, children, lgLayout = "media" }: Props) {
  const strip = lgLayout === "strip";
  const column = lgLayout === "column";
  // lg 에서 트랙이 스크롤 상자가 되는 모양 (가로 줄 · 세로 줄)
  const scrolls = strip || column;
  const total = images.length;

  // 1장이면 단순 표시
  const single = total === 1;

  // 트랙: [last, ...images, first] — 인덱스 1~total이 실제 이미지
  const track = single ? images : [images[total - 1], ...images, images[0]];

  // 현재 트랙 인덱스 (초기: 1 = 첫 번째 실제 이미지)
  const [pos, setPos] = useState(single ? 0 : 1);
  const [animated, setAnimated] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // 실제 dot 인덱스 (0-based)
  const dotIndex = single ? 0 : pos === 0 ? total - 1 : pos === total + 1 ? 0 : pos - 1;

  function goTo(nextPos: number, withAnim = true) {
    setAnimated(withAnim);
    setPos(nextPos);
    if (withAnim) setTransitioning(true);
    else setTransitioning(false);
  }

  // lg strip · column 은 트랙이 스크롤 상자가 된다 — 화살표는 사진 한 장(+ 간격)만큼 스크롤한다 (column 은 세로로)
  function scrollStrip(dir: 1 | -1): boolean {
    const track = trackRef.current;
    if (!scrolls || !track || !window.matchMedia(LG_QUERY).matches) return false;
    const slide = track.querySelector<HTMLElement>("[data-strip-slide]");
    const cs = getComputedStyle(track);
    if (column) {
      const step = slide ? slide.offsetHeight + parseFloat(cs.rowGap || "0") : track.clientHeight / 2;
      track.scrollBy({ top: dir * step, behavior: "smooth" });
    } else {
      const step = slide ? slide.offsetWidth + parseFloat(cs.columnGap || "0") : track.clientWidth / 2;
      track.scrollBy({ left: dir * step, behavior: "smooth" });
    }
    return true;
  }

  function next() { if (scrollStrip(1)) return; if (!transitioning) goTo(pos + 1); }
  function prev() { if (scrollStrip(-1)) return; if (!transitioning) goTo(pos - 1); }

  // 트랜지션 끝 후 클론에서 실제 위치로 순간 이동
  function onTransitionEnd() {
    if (!single) {
      if (pos === 0) goTo(total, false);
      else if (pos === total + 1) goTo(1, false);
      else setTransitioning(false);
    }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (!transitioning) {
      if (delta < -50) next();
      else if (delta > 50) prev();
    }
    touchStartX.current = null;
  };

  if (total === 0) return null;

  const trackTotal = track.length;

  // lg 클래스. 모바일 클래스는 그대로 두고 lg 에서만 덮는다
  const lg = column
    ? {
        // 높이는 미디어 줄이 정한다. 바탕 · 비율을 풀고 사진 카드들만 세로로 쌓는다 — 트랙이 세로 스크롤 상자
        frame: "lg:aspect-auto lg:bg-transparent lg:h-(--social-media-h)",
        track: "lg:h-full! lg:w-full! lg:transform-none! lg:flex-col lg:gap-3 lg:overflow-y-auto lg:snap-y lg:snap-mandatory lg:[scrollbar-width:none]",
        // 폭을 다 쓰는 4:3 사진. 남은 폭이 좁으면 사진도 작아진다
        slide: "lg:h-auto lg:w-full! lg:shrink-0 lg:aspect-[4/3] lg:snap-start lg:overflow-hidden lg:rounded-[14px] lg:bg-muted",
        clone: "lg:hidden",
        // 위 · 아래 가운데
        arrowSide: {
          prev: "lg:left-1/2 lg:top-3 lg:-translate-x-1/2 lg:translate-y-0",
          next: "lg:left-1/2 lg:right-auto lg:top-auto lg:bottom-3 lg:-translate-x-1/2 lg:translate-y-0",
        },
        arrowHide: total < 3 ? "lg:hidden" : "",
        overlay: "lg:hidden",
      }
    : strip
    ? {
        // 바탕 · 비율을 풀고 사진 카드들만 남긴다. 트랙이 스크롤 상자 — 인라인 폭 · 이동을 덮는다
        frame: "lg:aspect-auto lg:bg-transparent",
        track: "lg:h-auto lg:w-full! lg:transform-none! lg:gap-4 lg:overflow-x-auto lg:snap-x lg:snap-mandatory lg:[scrollbar-width:none]",
        // 2.5장이 보이는 폭 — 간격 16 두 개를 뺀 나머지를 2.5 로 나눈다
        slide: "lg:h-auto lg:w-[calc((100%-2rem)/2.5)]! lg:shrink-0 lg:aspect-[4/3] lg:snap-start lg:overflow-hidden lg:rounded-[14px] lg:bg-muted",
        // 앞뒤 복제(무한 루프용)는 줄에서 뺀다
        clone: "lg:hidden",
        arrowSide: { prev: "lg:left-3", next: "lg:right-3" },
        // 3장부터 넘칠 것이 생긴다
        arrowHide: total < 3 ? "lg:hidden" : "",
        overlay: "lg:hidden",
      }
    : {
        frame: "lg:aspect-video",
        track: "",
        slide: "",
        clone: "",
        arrowSide: { prev: "lg:left-4", next: "lg:right-4" },
        arrowHide: "",
        overlay: "",
      };
  // 화살표 — 모바일 · md 는 마우스를 올렸을 때만 보이는 검은 원, lg 는 늘 보이는 흰 원 40
  // column(임베드 옆 세로 사진 줄)은 사진 위에 얹히는 위아래 화살표라 반투명 검정 원 · 흰 아이콘
  const arrowLg = column
    ? "lg:size-10 lg:bg-black/60 lg:text-white lg:opacity-100 lg:shadow-md lg:hover:bg-black/75"
    : "lg:size-10 lg:bg-white/95 lg:text-foreground lg:opacity-100 lg:shadow-md lg:hover:bg-white";

  return (
    <div
      className={`group relative w-full aspect-[4/3] bg-muted overflow-hidden select-none touch-pan-y ${lg.frame}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 슬라이드 트랙 */}
      <div
        ref={trackRef}
        className={`${animated ? "flex h-full transition-transform duration-300 ease-in-out" : "flex h-full"} ${lg.track}`}
        style={{
          width: `${trackTotal * 100}%`,
          transform: `translateX(-${pos * (100 / trackTotal)}%)`,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {track.map((img, i) => (
          <div
            key={`${img.id}-${i}`}
            data-strip-slide={scrolls ? "" : undefined}
            className={`relative h-full ${lg.slide} ${!single && (i === 0 || i === trackTotal - 1) ? lg.clone : ""}`}
            style={{ width: `${100 / trackTotal}%` }}
          >
            {errorMap[img.id] ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <>
                {!loadedMap[img.id] && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200" />
                )}
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  style={focalStyle(img.focalX, img.focalY, img.zoom)}
                  sizes={scrolls ? "(min-width: 1024px) 320px, (min-width: 672px) 672px, 100vw" : "(min-width: 1024px) 800px, (min-width: 672px) 672px, 100vw"}
                  priority={i === 1}
                  unoptimized={isExternalImage(img.url)}
                  onLoad={() => setLoadedMap((m) => ({ ...m, [img.id]: true }))}
                  onError={() => setErrorMap((m) => ({ ...m, [img.id]: true }))}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* 위 · 아래 스크림 — 사진 위 버튼이 밝은 사진에서도 떠 보이게. 가장자리만 어둡히고 사진 가운데는 건드리지 않는다.
          위: 사진 높이의 28%, 가장 진한 곳 검정 40%. 아래: 원본 장면 카드 · 카메라 쪽이라 22%, 검정 18% 로 아주 옅게 */}
      {/* lg 는 사진 위 버튼이 없어(상단 바 · 제목 아래 아이콘 줄이 맡는다) 위 스크림을 뺀다 */}
      <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10 lg:hidden" />
      <div className={`absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-black/[0.18] to-transparent pointer-events-none z-10 ${lg.overlay}`} />

      {/* 화살표 버튼 (데스크톱, 2장 이상) */}
      {total >= 2 && (
        <>
          <button
            type="button"
            onClick={prev}
            className={`hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/60 ${arrowLg} ${lg.arrowSide.prev} ${lg.arrowHide}`}
            aria-label="이전 이미지"
          >
            <ChevronLeft className={`h-5 w-5 ${column ? "lg:hidden" : ""}`} />
            {column && <ChevronUp className="hidden h-5 w-5 lg:block" />}
          </button>
          <button
            type="button"
            onClick={next}
            className={`hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/60 ${arrowLg} ${lg.arrowSide.next} ${lg.arrowHide}`}
            aria-label="다음 이미지"
          >
            <ChevronRight className={`h-5 w-5 ${column ? "lg:hidden" : ""}`} />
            {column && <ChevronDown className="hidden h-5 w-5 lg:block" />}
          </button>
        </>
      )}

      {/* children overlay */}
      {children}

      {/* dot indicator — 몇 번째 사진인지는 점이 말한다. 우측 하단은 recreeshot 추가 버튼 자리라 숫자 카운터는 두지 않는다 */}
      {total >= 2 && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10 ${lg.overlay}`}>
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { if (!transitioning) goTo(i + 1); }}
              className={`rounded-full transition-all duration-200 ${
                i === dotIndex ? "w-3 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
