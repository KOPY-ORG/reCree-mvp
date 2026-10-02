import type { SourcePlatform } from "@/types";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { BookmarkCard } from "./BookmarkCard";
import { NetflixCard } from "./NetflixCard";

interface PostSource {
  id: string;
  url: string;
  sourceType: string;
  platform: SourcePlatform | null;
  sourceDetail: string | null;
  isOriginalLink: boolean;
}

interface Props {
  sources: PostSource[];
}

function isYouTube(source: PostSource): boolean {
  return (
    source.platform === "YOUTUBE" ||
    source.url.includes("youtube.com") ||
    source.url.includes("youtu.be")
  );
}

function isNetflix(source: PostSource): boolean {
  return source.platform === "NETFLIX" || source.url.includes("netflix.com");
}

export function SourceSection({ sources }: Props) {
  // 유튜브 임베드를 맨 위에, 나머지는 원래 순서대로 그 아래 (sort 는 안정 정렬)
  const visibleSources = sources
    .filter((s) => s.sourceType === "PRIMARY")
    .sort((a, b) => Number(isYouTube(b)) - Number(isYouTube(a)));

  if (visibleSources.length === 0) return null;

  return (
    // 소제목 없이 카드만 둔다. 영상이 스스로 출처임을 말한다 — 제목은 스크린리더에만 남긴다
    <section aria-label="From the Source" className="px-4 mt-8 mb-6">
      <div className="space-y-3">
        {visibleSources.map((source, i) =>
          isYouTube(source) ? (
            <div key={source.id}>
              {/* 유튜브가 맨 위로 정렬되므로 맨 위 하나만 자동재생 */}
              <YouTubeEmbed url={source.url} autoplay={i === 0} />
              {source.sourceDetail && (
                <p className="mt-1 text-center text-[11px] text-muted-foreground/70 italic">
                  {source.sourceDetail}
                </p>
              )}
            </div>
          ) : isNetflix(source) ? (
            <NetflixCard key={source.id} url={source.url} sourceDetail={source.sourceDetail} />
          ) : (
            <BookmarkCard key={source.id} url={source.url} platform={source.platform ?? undefined} sourceDetail={source.sourceDetail} />
          )
        )}
      </div>
    </section>
  );
}
