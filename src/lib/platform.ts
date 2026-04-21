import type { SourcePlatform } from "@/types";

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function detectPlatform(url: string): SourcePlatform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (matchesDomain(hostname, "youtube.com") || matchesDomain(hostname, "youtu.be")) return "YOUTUBE";
    if (matchesDomain(hostname, "twitter.com") || matchesDomain(hostname, "x.com")) return "X";
    if (matchesDomain(hostname, "instagram.com")) return "INSTAGRAM";
    if (matchesDomain(hostname, "pinterest.com") || matchesDomain(hostname, "pin.it")) return "PINTEREST";
    if (matchesDomain(hostname, "netflix.com")) return "NETFLIX";
    if (matchesDomain(hostname, "weverse.io")) return "WEVERSE";
    if (
      matchesDomain(hostname, "naver.com") ||
      matchesDomain(hostname, "tistory.com") ||
      matchesDomain(hostname, "velog.io") ||
      matchesDomain(hostname, "brunch.co.kr")
    ) return "BLOG";
    return "OTHER";
  } catch {
    return null;
  }
}
