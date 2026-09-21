import Link from "next/link";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { getPostMoreHref, type SectionData, type CuratedSectionWithSlug } from "@/lib/curation-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { PostCard } from "../../_components/PostCard";
import { GuideVideoCard } from "../../_components/GuideVideoCard";

type GuideVideo = { videoUrl: string; thumbnailUrl: string | null; titleEn: string };

/**
 * 어드민이 짠 큐레이션 섹션들. sections[i] 와 sectionData[i] 가 짝이다.
 *
 * 빈 섹션은 제목도 남기지 않고 통째로 건너뛴다 (명세 5.2).
 * 리크리샷 섹션은 맨 앞에 가이드 영상을 한 칸 끼운다 — 있을 때만.
 */
export function CuratedSections({
  sections,
  sectionData,
  tagGroupMap,
  savedPostIds,
  guideVideo,
}: {
  sections: CuratedSectionWithSlug[];
  sectionData: SectionData[];
  tagGroupMap: TagGroupColorMap;
  savedPostIds: Set<string>;
  guideVideo: GuideVideo | null;
}) {
  return (
    <>
      {sections.map((section, i) => {
        const data = sectionData[i];
        if (!data || data.items.length === 0) return null;

        if (data.kind === "reCreeshots") {
          return (
            <HScrollSection key={section.id} title={section.titleEn}>
              {guideVideo && (
                <div className="shrink-0 w-[120px]">
                  <GuideVideoCard
                    videoUrl={guideVideo.videoUrl}
                    thumbnailUrl={guideVideo.thumbnailUrl}
                    titleEn={guideVideo.titleEn}
                    className="aspect-[4/5] rounded-lg"
                  />
                </div>
              )}
              {data.items.map((shot) => (
                <Link key={shot.id} href={`/recreeshot/${shot.id}`} className="shrink-0 w-[120px] block">
                  <ReCreeshotImage
                    shotUrl={shot.imageUrl}
                    variant="thumb-sm"
                    className="aspect-[4/5] [filter:drop-shadow(0_3px_5px_rgba(0,0,0,0.18))]"
                    sizes="120px"
                  />
                </Link>
              ))}
            </HScrollSection>
          );
        }

        return (
          <HScrollSection key={section.id} title={section.titleEn} moreHref={getPostMoreHref(section)}>
            {data.items.map((post, index) => (
              <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} priority={index === 0} />
            ))}
          </HScrollSection>
        );
      })}
    </>
  );
}
