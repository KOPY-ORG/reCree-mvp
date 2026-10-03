"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LG_QUERY } from "@/lib/bottom-nav";
import { afterPageLoad } from "./after-page-load";
import { EMBED_FADE, EMBED_SKELETON_OVERLAY } from "./embed-styles";
import type { SocialEmbedSource } from "./social-source";

/**
 * 인스타그램 · X 원본 게시물 임베드 (유튜브 출처가 없는 글). 블록은 하나이고 화면 폭에 따라 모양만 바뀐다.
 *
 * - lg  : 미디어 줄(SocialMediaRow) 왼쪽. 오른쪽 열 맨 아래 좋아요 · 저장 · 도움이 됐어요 줄의 아래 끝까지의 높이에 카드를 원래 비율째 맞춘다.
 *         폭이 모자라 카드가 그보다 낮아지면 그 높이 그대로 둔다. 오른쪽 장소 사진 세로 캐러셀은 카드의 실제 높이(--social-media-h)를 따른다.
 * - lg 밑: 출처 카드 자리에 카드 자체만, 화면 폭에 맞춰.
 *
 * 서버가 oEmbed 로 임베드 가능을 확인한 글에서만 그린다. 그래도 불러오기 시작 후 8초 안에 카드가 뜨지 않으면 실패로 보고
 * SocialEmbedSwitch · SocialMediaRow 가 지금 화면(사진 미디어 칸 · 원본 장면 카드 · 출처 카드)으로 돌아간다.
 * 불러오기는 페이지가 다 그려진 뒤, 블록이 화면 가까이 올 때 시작한다. 카드 글은 영어로 고정한다(인스타 hl=en, X lang=en).
 */

const LOAD_TIMEOUT_MS = 8000;
// 기준 줄(좋아요 · 저장 · 도움이 됐어요)이 없는 글(미리보기)의 lg 미디어 높이 · 가장 낮은 높이
const DEFAULT_MEDIA_H = 480;
const MIN_MEDIA_H = 360;
// lg 미디어 줄 — 카드와 사진 캐러셀 사이 간격(gap-3), 사진 캐러셀이 남겨야 할 가장 좁은 폭
const ROW_GAP = 12;
const PHOTO_MIN_W = 160;

const FailContext = createContext<{ failed: boolean; fail: () => void }>({ failed: false, fail: () => {} });

/** 임베드와, 실패하면 돌아가야 하는 블록들(사진 · 출처 카드)을 함께 감싼다. DOM 은 만들지 않는다 */
export function SocialEmbedProvider({ children }: { children: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const value = useMemo(() => ({ failed, fail }), [failed, fail]);
  return <FailContext.Provider value={value}>{children}</FailContext.Provider>;
}

/** 임베드가 살아 있으면 embedded, 실패하면 fallback(지금 화면 모양)을 그린다 */
export function SocialEmbedSwitch({ embedded, fallback }: { embedded: React.ReactNode; fallback: React.ReactNode }) {
  return <>{useContext(FailContext).failed ? fallback : embedded}</>;
}

/**
 * lg 미디어 줄 — 임베드 카드 | 사진 세로 캐러셀. 모바일은 풀려서(contents) 두 블록이 바깥 격자의 제 순서 자리로 간다.
 * 실패하면 lg 에서도 풀어, 사진이 지금처럼 왼쪽 열의 미디어 칸이 된다.
 * --social-media-h 는 SocialEmbed 가 카드의 실제 높이로 덮어쓴다 (아래 30rem 은 재기 전 자리)
 */
export function SocialMediaRow({ children }: { children: React.ReactNode }) {
  const { failed } = useContext(FailContext);
  return (
    <div
      data-social-row
      className={failed ? "contents" : "contents lg:flex lg:items-start lg:gap-3 lg:px-4 lg:[--social-media-h:30rem]"}
    >
      {children}
    </div>
  );
}

function useIsLg(): boolean | null {
  const [isLg, setIsLg] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isLg;
}

// 페이지가 다 그려진 뒤, 블록이 화면 가까이(300px) 오면 true
function useLoadWhenVisible(ref: React.RefObject<HTMLElement | null>): boolean {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let observer: IntersectionObserver | null = null;
    const cancelWait = afterPageLoad(() => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          setGo(true);
        },
        { rootMargin: "300px 0px" }
      );
      observer.observe(el);
    });
    return () => {
      cancelWait();
      observer?.disconnect();
    };
  }, [ref]);
  return go;
}

type Media = { h: number; maxW: number };

/**
 * lg 미디어 높이 · 카드가 쓸 수 있는 가장 넓은 폭.
 * 목표 높이는 미디어 줄 위 끝에서 오른쪽 열 좋아요 · 저장 · 도움이 됐어요 줄(data-media-end) 아래 끝까지 —
 * 제목 줄바꿈 · 지도 · recreeshot 로드로 오른쪽 열이 바뀌면 다시 잰다.
 * 폭은 줄 안쪽 폭에서 사진 캐러셀의 가장 좁은 폭을 남긴 만큼이다
 */
function useMedia(rootRef: React.RefObject<HTMLElement | null>, enabled: boolean, hasPhotos: boolean): Media | null {
  const [media, setMedia] = useState<Media | null>(null);
  useEffect(() => {
    const row = rootRef.current?.closest<HTMLElement>("[data-social-row]");
    if (!enabled || !row) return;
    const end = document.querySelector<HTMLElement>("[data-media-end]");
    const measure = () => {
      const top = row.getBoundingClientRect().top;
      const h = Math.round(Math.max(MIN_MEDIA_H, end ? end.getBoundingClientRect().bottom - top : DEFAULT_MEDIA_H));
      const style = getComputedStyle(row);
      const inner = row.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const maxW = Math.floor(inner - (hasPhotos ? PHOTO_MIN_W + ROW_GAP : 0));
      setMedia((m) => (m && m.h === h && m.maxW === maxW ? m : { h, maxW }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    if (end?.parentElement) observer.observe(end.parentElement);
    return () => observer.disconnect();
  }, [rootRef, enabled, hasPhotos]);
  return media;
}

// lg 사진 세로 캐러셀 높이 = 카드가 실제로 차지한 높이 (스켈레톤일 때는 목표 높이). 카드가 폭에 걸려 낮아지면 사진도 같이 낮아진다
function useRowHeight(rootRef: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    const row = root?.closest<HTMLElement>("[data-social-row]");
    if (!enabled || !root || !row) return;
    const sync = () => row.style.setProperty("--social-media-h", `${root.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => {
      observer.disconnect();
      row.style.removeProperty("--social-media-h");
    };
  }, [rootRef, enabled]);
}

export function SocialEmbed({ embed, hasPhotos }: { embed: SocialEmbedSource; hasPhotos: boolean }) {
  const { fail } = useContext(FailContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const isLg = useIsLg();
  const media = useMedia(rootRef, isLg === true, hasPhotos);
  useRowHeight(rootRef, isLg === true);
  const visible = useLoadWhenVisible(rootRef);
  // lg 는 높이를 잰 뒤에 불러온다 — 카드 폭을 그 높이에 맞춰 고르기 때문이다
  const go = visible && isLg !== null && (!isLg || media !== null);
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    if (!go || loaded) return;
    const id = setTimeout(fail, LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [go, loaded, fail]);

  const props = { id: embed.id, go, media: isLg ? media : null, onLoad, fail };
  return (
    <div ref={rootRef}>
      {isLg === null ? (
        // 화면 폭을 알기 전(서버 · 첫 렌더). 모바일은 인스타 4:5 카드 어림 높이, lg 는 미디어 높이
        <Skeleton className="h-[calc(125vw+168px)] rounded-none lg:h-(--social-media-h) lg:w-[calc(var(--social-media-h)*0.6)]" />
      ) : embed.platform === "INSTAGRAM" ? (
        // 폭에 따라 그리는 방식이 달라 lg 경계를 넘으면 새로 그린다
        <InstagramCard key={String(isLg)} {...props} />
      ) : (
        <XCard key={String(isLg)} {...props} />
      )}
    </div>
  );
}

type CardProps = {
  id: string;
  go: boolean;
  // lg 면 미디어 높이 · 최대 폭, 모바일이면 null
  media: Media | null;
  onLoad: () => void;
  fail: () => void;
};

// lg 에서 카드 크기를 알기 전 자리 — 미디어 높이에 어림 비율(폭 / 높이)의 폭
function placeholderBox(media: Media, ratio: number) {
  return { width: media.h * ratio, height: media.h };
}

// lg 에서 카드를 미디어 높이에 맞춘 배율. 쓸 수 있는 폭을 넘으면 폭에 맞춘다
function lgScale(media: Media, natural: { w: number; h: number }): number {
  return Math.min(media.h / natural.h, media.maxW / natural.w);
}

// ---------- 인스타그램 ----------

// lg 에서 그리는 폭 — 인스타 임베드의 가장 좁은 폭. 높이에 맞춰 비율째 키우거나 줄이는데,
// 좁게 그릴수록 같은 높이에서 덜 줄어 글자가 크다
const IG_LG_W = 326;

function InstagramCard({ id, go, media, onLoad }: CardProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // iframe 이 보내는 MEASURE 메시지의 카드 높이. 사진이 늦게 뜨면 다시 온다
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!go) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.instagram.com" || e.source !== frameRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const h = data?.type === "MEASURE" ? Number(data.details?.height) : 0;
        if (h > 0) setHeight(Math.ceil(h));
      } catch {
        // 다른 형식의 메시지는 무시한다
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [go]);

  useEffect(() => {
    if (height !== null) onLoad();
  }, [height, onLoad]);

  const s = media && height !== null ? lgScale(media, { w: IG_LG_W, h: height }) : 1;
  const ready = height !== null;
  const frame = go && (
    <iframe
      ref={frameRef}
      src={`https://www.instagram.com/p/${id}/embed/?hl=en`}
      title="Instagram post"
      scrolling="no"
      className={`border-0 bg-white ${EMBED_FADE} ${
        media ? "absolute left-0 top-0 origin-top-left" : ready ? "block w-full" : "absolute inset-x-0 top-0"
      } ${ready ? "opacity-100" : "opacity-0"}`}
      style={media ? { width: IG_LG_W, height: height ?? 600, transform: `scale(${s})` } : { height: height ?? 600 }}
    />
  );

  if (media) {
    // 축소 · 확대는 transform 이라 자리를 차지하지 않는다 — 보이는 크기만큼 자리를 잡는다
    const box = height !== null ? { width: IG_LG_W * s, height: height * s } : placeholderBox(media, 0.6);
    return (
      <div className="relative overflow-hidden" style={box}>
        {frame}
        {!ready && <Skeleton className={EMBED_SKELETON_OVERLAY} />}
      </div>
    );
  }
  // 칸 안 스크롤이 없도록 iframe 높이를 카드 높이와 같게 둔다
  return (
    <div className="relative">
      {!ready && <Skeleton className="h-[calc(125vw+168px)] rounded-none" />}
      {frame}
    </div>
  );
}

// ---------- X ----------

interface TwttrWidgets {
  widgets: {
    createTweet(id: string, el: HTMLElement, opts: Record<string, unknown>): Promise<HTMLElement | undefined>;
  };
  ready(cb: (t: TwttrWidgets) => void): void;
}

let widgetsPromise: Promise<TwttrWidgets> | null = null;

function loadWidgets(): Promise<TwttrWidgets> {
  const win = window as Window & { twttr?: TwttrWidgets };
  if (!widgetsPromise) {
    widgetsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.onload = () => (win.twttr ? win.twttr.ready(resolve) : reject(new Error("twttr missing")));
      script.onerror = () => {
        widgetsPromise = null;
        reject(new Error("widgets.js failed"));
      };
      document.head.appendChild(script);
    });
  }
  return widgetsPromise;
}

// X 위젯이 허용하는 게시물 폭
const X_MIN_W = 250;
const X_MAX_W = 550;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 카드 높이가 자리 잡을 때까지 기다린다. 위젯은 폭이 바뀐 뒤 조금 늦게 resize 메시지로 iframe 높이를 고치므로
// 먼저 높이가 before 에서 바뀌기를(최대 1.5초) 기다리고, 그 뒤 네 번 연속(0.3초) 같으면 다 그려진 것으로 본다.
// offsetHeight 는 축소(transform) 전 크기다
async function settledHeight(frame: HTMLIFrameElement, before: number): Promise<number> {
  for (let i = 0; i < 15 && frame.offsetHeight === before; i++) await wait(100);
  let prev = -1;
  let same = 0;
  for (let i = 0; i < 30 && same < 3; i++) {
    await wait(100);
    const h = frame.offsetHeight;
    same = h > 0 && h === prev ? same + 1 : 0;
    prev = h;
  }
  return prev;
}

/**
 * lg: 카드 높이는 폭에 따라 거의 직선으로 변한다(사진 높이가 폭에 비례 + 위아래 고정 줄) — 두 폭에서 재서
 * 미디어 높이에 맞는 폭을 구하고, 잰 값으로 몇 번 고쳐 좁혀 간다. 남는 차이는 비율째 키우거나 줄여 맞춘다.
 * 카드는 한 번만 불러오고 폭만 바꿔 다시 잰다. 재는 동안에는 스켈레톤 뒤에 숨긴다.
 * 모바일: 화면 폭 그대로(최대 550) 둔다
 */
function XCard({ id, go, media, onLoad, fail }: CardProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // lg 에서 맞춘 카드의 원래 크기 (배율 적용 전)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // 측정은 불러올 때 한 번만 한다 — 그 뒤 미디어 높이가 바뀌면 배율만 다시 계산한다
  const mediaRef = useRef(media);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  const isLg = media !== null;

  useEffect(() => {
    const holder = holderRef.current;
    if (!go || !holder) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    // 실행마다 새 자리에 그린다 — 정리된 뒤 늦게 도착한 카드는 떼어 낸 자리에 붙어 화면에 남지 않는다
    const target = document.createElement("div");
    if (isLg) target.style.width = `${X_MAX_W}px`;
    holder.appendChild(target);

    (async () => {
      const twttr = await loadWidgets();
      if (cancelled) return;
      const el = await twttr.widgets.createTweet(id, target, { dnt: true, lang: "en", conversation: "none", align: "center" });
      if (cancelled) return;
      const frame = el?.querySelector("iframe");
      if (!el || !frame) return fail();
      onLoad();
      // 위젯이 붙이는 위아래 마진을 지운다 — 카드 자체만 남긴다. 좌우는 auto — 모바일 · 태블릿에서 카드(최대 550)가 가운데 선다
      el.style.margin = "0 auto";
      const m = mediaRef.current;
      if (!isLg || !m) {
        setReady(true);
        return;
      }

      // 위젯 바깥 div(flex)는 부모 폭을 100% 채우고 iframe 이 그 안을 늘려 채운다 — 그래서 폭은 그 부모(target)에 준다.
      // 위젯은 iframe 에 직전 폭을 px 로 박아 두므로, flex 최소 폭(auto)이 그보다 좁아지지 못하게 막는다 — min-width 0 으로 푼다
      frame.style.minWidth = "0";
      const setWidth = (w: number) => {
        target.style.width = `${w}px`;
      };
      const maxW = Math.max(X_MIN_W, Math.min(X_MAX_W, m.maxW));
      let prev = { w: X_MAX_W, h: await settledHeight(frame, 0) };
      setWidth(X_MIN_W);
      let last = { w: X_MIN_W, h: await settledHeight(frame, prev.h) };
      // 두 점을 잇는 직선으로 미디어 높이에 맞는 폭을 구하고, 그 폭에서 다시 잰 값으로 고친다 (최대 3번)
      for (let i = 0; i < 3 && !cancelled; i++) {
        const slope = (prev.h - last.h) / (prev.w - last.w);
        const next = Math.round(Math.max(X_MIN_W, Math.min(maxW, slope > 0 ? last.w + (m.h - last.h) / slope : maxW)));
        if (Math.abs(next - last.w) < 4) break;
        setWidth(next);
        prev = last;
        last = { w: next, h: await settledHeight(frame, last.h) };
        if (Math.abs(last.h - m.h) < 8) break;
      }
      if (cancelled) return;
      const width = last.w;
      // 그 뒤에도 사진이 늦게 뜨거나 글꼴이 바뀌어 높이가 달라지면 다시 맞춘다
      const update = () => setNatural({ w: width, h: frame.offsetHeight });
      update();
      setReady(true);
      observer = new ResizeObserver(update);
      observer.observe(frame);
    })().catch(() => {
      if (!cancelled) fail();
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      target.remove();
    };
  }, [go, id, isLg, onLoad, fail]);

  if (media) {
    const s = ready && natural ? lgScale(media, natural) : 1;
    const box = ready && natural ? { width: natural.w * s, height: natural.h * s } : placeholderBox(media, 0.75);
    return (
      <div className="relative overflow-hidden" style={box}>
        {/* 축소 · 확대한 iframe 도 누르고 넘기는 것은 그대로 된다 */}
        <div
          ref={holderRef}
          className={`absolute left-0 top-0 origin-top-left ${EMBED_FADE} ${ready ? "opacity-100" : "opacity-0"}`}
          style={{ transform: `scale(${s})` }}
        />
        {!ready && <Skeleton className={EMBED_SKELETON_OVERLAY} />}
      </div>
    );
  }
  return (
    <div className="relative">
      {!ready && <Skeleton className="h-[420px] rounded-none" />}
      <div
        ref={holderRef}
        className={`${EMBED_FADE} ${ready ? "opacity-100" : "absolute inset-x-0 top-0 opacity-0"}`}
      />
    </div>
  );
}
