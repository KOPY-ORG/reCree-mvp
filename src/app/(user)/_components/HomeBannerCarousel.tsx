import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { isExternalImage, focalStyle } from "@/lib/image";
import { labelBackground } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { ScrapButton } from "./ScrapButton";

export type BannerItem = {
  id: string;
  slug: string;
  titleEn: string;
  displayName: string;
  thumbnailUrl: string | null;
  focalX?: number | null;
  focalY?: number | null;
  zoom?: number | null;
  labels: {
    text: string;
    colorHex: string;
    colorHex2: string | null;
    gradientDir: string;
    gradientStop: number;
    textColorHex: string;
  }[];
  isSaved: boolean;
};

export function HomeBannerCarousel({ banners }: { banners: BannerItem[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex items-start gap-3 pl-4 pb-2">
        {banners.map((banner, index) => (
          <Link
            key={banner.slug}
            href={`/posts/${banner.slug}`}
            className={`shrink-0 w-[85%] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] bg-white${index === banners.length - 1 ? " mr-4" : ""}`}
          >
            {/* 사진 영역 */}
            <div className="relative aspect-video overflow-hidden bg-muted">
              {banner.thumbnailUrl ? (
                <Image
                  src={banner.thumbnailUrl}
                  alt={banner.titleEn}
                  fill
                  unoptimized={isExternalImage(banner.thumbnailUrl)}
                  className="object-cover"
                  style={focalStyle(banner.focalX, banner.focalY, banner.zoom)}
                  sizes="(max-width: 672px) 85vw, 560px"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                <div className="flex-1 flex flex-wrap gap-1 [--pill-fs:var(--text-xs)]">
                  {banner.labels.map((label, i) => (
                    <LabelBadge
                      key={i}
                      text={label.text}
                      background={labelBackground(label)}
                      color={label.textColorHex}
                    />
                  ))}
                </div>
                <div className="shrink-0">
                  <ScrapButton
                    postId={banner.id}
                    initialSaved={banner.isSaved}
                    size="md"
                    unsavedClassName="text-white/80 hover:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 텍스트 영역 */}
            <div className="px-3 pt-2 pb-2">
              {/* min-h: leading-snug 2줄 높이(2×1.375em=2.75em)에 맞춘 값. leading 변경 시 함께 조정 필요 */}
              <p className="text-base font-semibold leading-snug line-clamp-2 min-h-[2.75em] text-foreground">
                {banner.titleEn}
              </p>
              <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground mt-1 min-h-[1rem]">
                {banner.displayName !== banner.titleEn && (
                  <>
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="line-clamp-1">{banner.displayName}</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
