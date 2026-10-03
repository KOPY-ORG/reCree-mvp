// 게시글 상세의 검색 · 공유용 정보 — generateMetadata 와 JSON-LD 가 같이 쓴다

export function postUrl(slug: string): string {
  return `https://recree.io/posts/${slug}`;
}

/** 본문이 없을 때 쓰는 설명 문구 */
export function fallbackDescription(titleEn: string, placeLabel: string | null | undefined): string {
  return placeLabel
    ? `Visit ${placeLabel}, the exact filming location from ${titleEn}. Discover iconic K-content spots with reCree.`
    : "Discover iconic K-content spots with reCree.";
}

/** schema.org Article. 장소가 있으면 TouristAttraction 을 about 으로 붙인다 */
export function buildPostJsonLd({
  slug,
  titleEn,
  bodyEn,
  imageUrls,
  placeLabel,
  place,
}: {
  slug: string;
  titleEn: string;
  bodyEn: string | null;
  imageUrls: string[];
  placeLabel: string | null | undefined;
  place: { addressEn: string | null } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": titleEn,
    // 메타 설명과 달리 빈 본문("")은 그대로 둔다 — 지금 동작 그대로 (cleanup-backlog 3-16)
    "description": bodyEn?.slice(0, 160) ?? fallbackDescription(titleEn, placeLabel),
    "image": imageUrls.map((url) => ({
      "@type": "ImageObject",
      "url": url,
      "contentUrl": url,
    })),
    "url": postUrl(slug),
    "publisher": {
      "@type": "Organization",
      "name": "reCree",
      "url": "https://recree.io",
    },
    ...(place && {
      "about": {
        "@type": "TouristAttraction",
        "name": placeLabel,
        "address": place.addressEn ?? undefined,
      },
    }),
  };
}
