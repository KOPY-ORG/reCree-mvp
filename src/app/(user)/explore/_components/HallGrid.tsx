import Link from "next/link";
import Image from "next/image";

interface HallShot {
  id: string;
  imageUrl: string;
  referencePhotoUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
}

interface Props {
  shots: HallShot[];
}

export function HallGrid({ shots }: Props) {
  if (shots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        아직 리크리샷이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {shots.map((shot) => (
        <Link key={shot.id} href={`/explore/hall/${shot.id}`}>
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
            <Image
              src={shot.imageUrl}
              alt="recreeshot"
              fill
              className="object-cover"
              sizes="(max-width: 672px) 50vw, 336px"
            />
            {/* 원본 사진 썸네일 (좌하단) */}
            {shot.referencePhotoUrl && (
              <div className="absolute bottom-2 left-2 size-10 rounded overflow-hidden border-2 border-white">
                <Image
                  src={shot.referencePhotoUrl}
                  alt="reference"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            )}
            {/* 점수 배지 (우상단) */}
            {shot.matchScore != null && shot.showBadge && (
              <span className="absolute top-2 right-2 bg-brand text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {Math.round(shot.matchScore)}%
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
