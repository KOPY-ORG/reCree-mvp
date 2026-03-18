import { YouTubeEmbed } from "./YouTubeEmbed";
import { BookmarkCard } from "./BookmarkCard";

interface PostSource {
  id: string;
  url: string;
  sourceType: string;
  platform: string | null;
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

export function SourceSection({ sources }: Props) {
  const visibleSources = sources.filter((s) => s.sourceType === "PRIMARY");

  if (visibleSources.length === 0) return null;

  return (
    <section className="px-4 mt-8 mb-6">
      <h2 className="text-base font-bold mb-3">From the Source</h2>
      <div className="space-y-3">
        {visibleSources.map((source) =>
          isYouTube(source) ? (
            <YouTubeEmbed key={source.id} url={source.url} />
          ) : (
            <BookmarkCard key={source.id} url={source.url} platform={source.platform ?? undefined} />
          )
        )}
      </div>
    </section>
  );
}
