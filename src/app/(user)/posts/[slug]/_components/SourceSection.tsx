import type { SourcePlatform } from "@/types";
import { YouTubeEmbed } from "./YouTubeEmbed";
import { BookmarkCard } from "./BookmarkCard";
import { NetflixCard } from "./NetflixCard";
import { parseYouTubeSource } from "./youtube-source";

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
  /** 맨 위 유튜브 묶음에서만 true — 페이지에서 맨 위 유튜브 하나만 자동재생한다 */
  autoplay?: boolean;
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

/**
 * 화면에 보일 출처(PRIMARY)를 맨 위 유튜브 하나와 나머지로 나눈다.
 * 유튜브를 맨 위에, 나머지는 원래 순서대로 그 아래다 (sort 는 안정 정렬) — 둘을 이어 붙이면 모바일의 한 줄 순서 그대로다.
 * lg 에서 맨 위 유튜브는 왼쪽 열 미디어 칸이 되고, 나머지는 오른쪽 열 출처 카드가 된다
 */
export function splitSources<T extends PostSource>(sources: T[]): { youTube: T | null; rest: T[] } {
  const visible = sources
    .filter((s) => s.sourceType === "PRIMARY")
    .sort((a, b) => Number(isYouTube(b)) - Number(isYouTube(a)));
  // 영상 ID 를 못 꺼내는 유튜브 링크는 미디어 칸을 비게 하므로 나머지에 남긴다 (YouTubeEmbed 가 null)
  const first = visible[0];
  return first && isYouTube(first) && parseYouTubeSource(first.url)
    ? { youTube: first, rest: visible.slice(1) }
    : { youTube: null, rest: visible };
}

// splitSources 로 나눈 한 묶음을 그린다. 맨 위 유튜브 묶음만 자동재생한다 (나머지 유튜브는 눌러서 재생)
export function SourceSection({ sources, autoplay = false }: Props) {
  if (sources.length === 0) return null;

  return (
    // 소제목 없이 카드만 둔다. 영상이 스스로 출처임을 말한다 — 제목은 스크린리더에만 남긴다
    <section aria-label="From the Source" className="px-4 mt-8 mb-6">
      <div className="space-y-3">
        {sources.map((source, i) =>
          isYouTube(source) ? (
            <div key={source.id}>
              <YouTubeEmbed url={source.url} autoplay={autoplay && i === 0} />
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
