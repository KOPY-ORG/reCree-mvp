import Link from "next/link";
import { GuideVideoCard } from "../../_components/GuideVideoCard";

interface HallShot {
  id: string;
  imageUrl: string;
  matchScore: number | null;
  showBadge: boolean;
  referencePhotoUrl: string | null;
}

interface GuideVideoItem {
  videoUrl: string;
  thumbnailUrl: string | null;
  titleEn: string;
}

interface Props {
  shots: HallShot[];
  guideVideo?: GuideVideoItem | null;
}

export function HallGrid({ shots, guideVideo }: Props) {
  if (shots.length === 0 && !guideVideo) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        아직 리크리샷이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {guideVideo && (
        <GuideVideoCard
          videoUrl={guideVideo.videoUrl}
          thumbnailUrl={guideVideo.thumbnailUrl}
          titleEn={guideVideo.titleEn}
          className="aspect-[4/5] rounded-lg"
        />
      )}
      {shots.map((shot) => (
        <Link key={shot.id} href={`/explore/hall/${shot.id}`} className="relative block">
          <img
            src={shot.imageUrl}
            alt="recreeshot"
            className="w-full aspect-[4/5] object-cover bg-muted"
            style={{ borderRadius: "7%" }}
          />
          {/* 소스 이미지 overlay */}
          {shot.referencePhotoUrl && (
            <div className="absolute rounded-[10%] overflow-hidden" style={{ top: "3%", left: "3%", width: "18%", aspectRatio: "4/5", outline: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 0 12px 5px rgba(255,255,255,0.6)" }}>
              <img src={shot.referencePhotoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {shot.showBadge && shot.matchScore !== null && (
            <div className="absolute top-1.5 right-1.5 text-black text-[10px] font-bold px-2 py-0.5 rounded-full leading-none" style={{ background: "linear-gradient(to right, #C8FF09, #ffffff 150%)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
              {Math.round(shot.matchScore)}%
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
