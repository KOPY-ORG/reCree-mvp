"use client";

import { useEffect, useRef, useState } from "react";
import { VolumeX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { parseYouTubeSource, type YouTubeSource } from "./youtube-source";

interface Props {
  url: string;
  // 페이지에서 맨 위 유튜브 하나만 true — 나머지는 눌러서 재생
  autoplay?: boolean;
}

// YouTube IFrame API 중 여기서 쓰는 것만
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  unMute(): void;
  getPlayerState(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

// 사진·제목이 다 그려진 뒤(load) 브라우저가 한가할 때 플레이어를 부른다
function afterPageLoad(cb: () => void): () => void {
  let idleId: number | null = null;
  const run = () => {
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(cb, { timeout: 2000 });
    } else {
      idleId = globalThis.setTimeout(cb, 0) as unknown as number;
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    window.removeEventListener("load", run);
    if (idleId === null) return;
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    else globalThis.clearTimeout(idleId);
  };
}

function prefersNoAutoplay(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return (
    connection?.saveData === true ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// 영어 자막을 기본으로 켜고 플레이어 UI 도 영어로. 자동재생 · 눌러서 재생 두 경로 공통
const CAPTION_PARAMS = { cc_load_policy: "1", cc_lang_pref: "en", hl: "en" };

function embedSrc({ videoId, start }: YouTubeSource): string {
  const params = new URLSearchParams({ playsinline: "1", rel: "0", ...CAPTION_PARAMS });
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

export function YouTubeEmbed({ url, autoplay = false }: Props) {
  const source = parseYouTubeSource(url);
  // "auto" 는 서버·첫 렌더 값. 마운트 후 데이터 절약·모션 줄이기면 "tap" 으로 내린다
  const [mode, setMode] = useState<"auto" | "tap">(autoplay ? "auto" : "tap");
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (mode !== "auto" || !source) return;
    if (prefersNoAutoplay()) {
      setMode("tap");
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let visible = false;
    // 사용자가 직접 멈춘 영상은 다시 보여도 이어 재생하지 않는다
    let pausedByUser = false;
    let pausingByObserver = false;
    let observer: IntersectionObserver | null = null;

    const createPlayer = async () => {
      const YT = await loadYouTubeApi();
      if (cancelled) return;
      // YT.Player 가 이 요소를 iframe 으로 갈아끼우므로 React 가 모르는 요소를 쓴다
      const target = document.createElement("div");
      container.appendChild(target);
      playerRef.current = new YT.Player(target, {
        host: "https://www.youtube-nocookie.com",
        videoId: source.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
          ...CAPTION_PARAMS,
          ...(source.start > 0 && { start: source.start }),
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            if (!visible) playerRef.current?.pauseVideo();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PAUSED) {
              pausedByUser = !pausingByObserver;
              pausingByObserver = false;
            } else if (e.data === YT.PlayerState.PLAYING) {
              pausedByUser = false;
            }
          },
        },
      });
    };

    const cancelWait = afterPageLoad(() => {
      if (cancelled) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          const player = playerRef.current;
          if (!player) {
            // 처음 화면에 들어올 때 플레이어를 만든다
            if (visible) void createPlayer();
            return;
          }
          if (visible) {
            if (!pausedByUser) player.playVideo();
          } else if (player.getPlayerState() === window.YT?.PlayerState.PLAYING) {
            pausingByObserver = true;
            player.pauseVideo();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(container);
    });

    return () => {
      cancelled = true;
      cancelWait();
      observer?.disconnect();
      playerRef.current?.destroy();
      playerRef.current = null;
      container.replaceChildren();
    };
    // source 는 url 에서 매 렌더 새로 만들어지므로 url 로 의존한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, url]);

  if (!source) return null;

  // 플레이어가 준비되기 전까지 같은 크기의 스켈레톤을 덮는다
  const skeleton = !ready && <Skeleton className="absolute inset-0 rounded-none" />;

  if (mode === "tap") {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden w-full lg:rounded-[20px]">
        <iframe
          src={embedSrc(source)}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title="YouTube video"
          onLoad={() => setReady(true)}
        />
        {skeleton}
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden w-full lg:rounded-[20px]">
      <div ref={containerRef} className="absolute inset-0 [&>iframe]:size-full" />
      {skeleton}
      {/* 아이콘만 둔 반투명 원. 브랜드 라임 90% + blur 로 영상이 살짝 비친다. 라임 위 아이콘은 검정.
          누르면 바로 줄어들고(press-scale), 소리가 켜지면 작아지며 사라진다. 사라진 뒤에는 포커스 순서에서도 빠진다 */}
      {ready && (
        <button
          type="button"
          onClick={() => {
            playerRef.current?.unMute();
            playerRef.current?.playVideo();
            setMuted(false);
          }}
          aria-label="Turn sound on"
          aria-hidden={!muted}
          tabIndex={muted ? 0 : -1}
          className={`press-scale absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-brand/90 text-brand-foreground backdrop-blur-sm transition-[transform,scale,opacity,visibility] duration-150 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            muted ? "" : "invisible scale-90 opacity-0 delay-[0ms,0ms,0ms,150ms]"
          }`}
        >
          <VolumeX className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
