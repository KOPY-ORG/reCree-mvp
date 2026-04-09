import { NextRequest, NextResponse } from "next/server";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;

/**
 * 캔버스 합성용 이미지 프록시.
 * 브라우저에서 CDN 이미지를 직접 캔버스에 그리면 CORS 오류 발생 →
 * 서버에서 대신 fetch해서 반환하면 same-origin으로 인식되어 캔버스에 사용 가능.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || !url.startsWith(CDN_URL)) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) return new NextResponse("Not found", { status: 404 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("Content-Type") ?? "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
