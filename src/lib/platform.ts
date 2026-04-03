import type { SourcePlatform } from "@/types";

export function detectPlatform(url: string): SourcePlatform | null {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YOUTUBE";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "X";
    if (hostname.includes("instagram.com")) return "INSTAGRAM";
    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) return "PINTEREST";
    if (hostname.includes("netflix.com")) return "NETFLIX";
    if (
      hostname.includes("naver.com") ||
      hostname.includes("tistory.com") ||
      hostname.includes("velog.io") ||
      hostname.includes("brunch.co.kr")
    ) return "BLOG";
    return "OTHER";
  } catch {
    return null;
  }
}
