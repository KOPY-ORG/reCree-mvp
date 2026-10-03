// 출처 유튜브 URL 에서 영상 ID 와 시작 시간을 꺼낸다. 서버·클라이언트 공용

export interface YouTubeSource {
  videoId: string;
  start: number;
}

// 1h2m3s · 90s · 90 형식의 t / start 값을 초로
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export function parseYouTubeSource(url: string): YouTubeSource | null {
  try {
    const u = new URL(url);
    const start = parseStart(u.searchParams.get("t") ?? u.searchParams.get("start"));
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      videoId = u.searchParams.get("v");
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) {
      videoId = u.pathname.split("/shorts/")[1].split("/")[0];
    }
    return videoId ? { videoId, start } : null;
  } catch {
    return null;
  }
}

// 공식 썸네일. maxresdefault 가 없는 영상은 hqdefault 로 대체한다
export function youTubeThumbnail(videoId: string, size: "maxresdefault" | "hqdefault"): string {
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}
