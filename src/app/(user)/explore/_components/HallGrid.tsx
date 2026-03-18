import Link from "next/link";
import { GuideVideoCard } from "../../_components/GuideVideoCard";
import { ReCreeshotImage } from "@/components/recreeshot-image";

interface LabelItem {
  text: string;
  background: string;
  color: string;
}

interface HallShot {
  id: string;
  imageUrl: string;
  matchScore: number | null;
  showBadge: boolean;
  referencePhotoUrl: string | null;
  labels: LabelItem[];
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
        <Link key={shot.id} href={`/explore/hall/${shot.id}`} className="block relative">
          <ReCreeshotImage
            shotUrl={shot.imageUrl}
            referenceUrl={shot.referencePhotoUrl}
            matchScore={shot.matchScore}
            showBadge={shot.showBadge}
            referencePosition="top-left"
            badgePosition="top-right"
            variant="thumb-md"
            className="w-full aspect-[4/5]"
            sizes="50vw"
          />
          {shot.labels.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
              {shot.labels.map((label, i) => (
                <span
                  key={i}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none max-w-[90px] truncate"
                  style={{
                    background: label.background,
                    color: label.color,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }}
                >
                  {label.text}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
