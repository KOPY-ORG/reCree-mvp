interface Props {
  url: string;
  sourceDetail?: string | null;
}

function parseNetflixTitleId(url: string): string | null {
  return url.match(/\/(?:title|watch)\/(\d+)/)?.[1] ?? null;
}

export function NetflixCard({ url, sourceDetail }: Props) {
  const titleId = parseNetflixTitleId(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-row rounded-xl border border-gray-200 overflow-hidden min-h-20"
    >
      {/* 좌측 */}
      <div className="w-20 shrink-0 self-stretch flex items-center justify-center bg-black">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#DC211E">
          <polygon points="5,3 21,12 5,21" />
        </svg>
      </div>

      {/* 우측 텍스트 */}
      <div className="flex-1 px-3 py-2.5 min-w-0 flex flex-col justify-center">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
          netflix.com{titleId ? ` · ${titleId}` : ""}
        </p>
        <p className="text-[13px] font-medium text-foreground mt-0.5 leading-snug">
          Watch on Netflix
        </p>
        {sourceDetail && (
          <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug italic">{sourceDetail}</p>
        )}
      </div>
    </a>
  );
}
