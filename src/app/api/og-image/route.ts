import { NextRequest, NextResponse } from "next/server";

const ALLOWED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "twitter.com",
  "x.com",
  "pinterest.com",
  "tiktok.com",
  "weverse.io",
  "naver.com",
  "namu.wiki",
];

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return ALLOWED_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function extractOgImage(html: string): string | null {
  // og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) return ogMatch[1];

  // twitter:image
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twMatch?.[1]) return twMatch[1];

  // 첫 번째 <img src
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) return imgMatch[1];

  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  if (!isAllowedDomain(url)) {
    return NextResponse.json({ thumbnailUrl: null });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; reCreeBot/1.0)" },
    });
    clearTimeout(timer);

    const html = await res.text();
    const thumbnailUrl = extractOgImage(html);
    return NextResponse.json({ thumbnailUrl });
  } catch {
    return NextResponse.json({ thumbnailUrl: null });
  }
}
