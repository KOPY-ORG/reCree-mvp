import Link from "next/link";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { GuideVideoCard } from "../../_components/GuideVideoCard";

interface HallShot {
  id: string;
  imageUrl: string;
  referencePhotoUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
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
        <Link key={shot.id} href={`/explore/hall/${shot.id}`}>
          <ReCreeshotImage
            shotUrl={shot.imageUrl}
            referenceUrl={shot.referencePhotoUrl}
            matchScore={shot.matchScore}
            showBadge={shot.showBadge}
            referencePosition="top-left"
            badgePosition="top-right"
            showMatchLabel={false}
            rounded={false}
            className="aspect-[4/5] rounded-lg"
            sizes="(max-width: 672px) 50vw, 336px"
          />
        </Link>
      ))}
    </div>
  );
}
