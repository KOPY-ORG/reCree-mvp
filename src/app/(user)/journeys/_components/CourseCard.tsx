import Link from "next/link";
import { LabelBadge } from "@/components/LabelBadge";
import { DEFAULT_COLOR, labelBackground, resolveTopicColors } from "@/lib/post-labels";
import type { CourseListItem } from "@/lib/course-queries";

/** Topic이 하나도 없을 때 — post-labels의 DEFAULT_COLOR에서 background/light로 떨어지는 중립 그라데이션 */
const NEUTRAL_COVER = `linear-gradient(to bottom, ${DEFAULT_COLOR}, #F3F3F3)`;

/**
 * 커버 배경 — 사진이 아니라 Topic 색에서만 만든다.
 *
 * Topic 1개  labelBackground와 같은 규칙. colorHex2가 null이면 단색, gradientDir/gradientStop 반영
 * Topic 2개+ 각 Topic의 colorHex를 순서대로 이어 붙인다. 방향은 첫 Topic의 gradientDir
 * Topic 0개  중립 그라데이션
 *
 * colorHex가 null인 Topic은 resolveTopicColors가 DEFAULT_COLOR로 떨어뜨린다.
 * (CourseTopicLabel은 parent를 싣지 않으므로 상속 없이 곧바로 기본색이다)
 */
function coverBackground(topics: CourseListItem["topics"]): string {
  if (topics.length === 0) return NEUTRAL_COVER;

  const resolved = topics.map((topic) => resolveTopicColors(topic));

  // 단일 Topic은 배지와 같은 배경을 쓴다 — 그라데이션 문자열 조립을 중복하지 않는다
  if (resolved.length === 1) return labelBackground({ text: "", ...resolved[0] });

  return `linear-gradient(${resolved[0].gradientDir}, ${resolved.map((c) => c.colorHex).join(", ")})`;
}

export function CourseCard({
  course,
  isMine = false,
}: {
  course: CourseListItem;
  /** 내 코스 목록에서만 true — Private 배지 노출 여부를 가른다 */
  isMine?: boolean;
}) {
  const dayLabel = `${course.dayCount} ${course.dayCount === 1 ? "day" : "days"}`;
  const placeLabel = `${course.itemCount} ${course.itemCount === 1 ? "place" : "places"}`;

  return (
    <Link href={`/journeys/${course.id}`} className="block">
      <div
        className="relative aspect-[4/3] rounded-lg overflow-hidden"
        style={{ background: coverBackground(course.topics) }}
      >
        {/* 공개 목록에는 비공개 코스가 애초에 안 실리므로 내 코스에서만 의미가 있다 */}
        {isMine && !course.isPublic && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold">
            Private
          </span>
        )}
      </div>

      <div className="pt-2 space-y-1">
        <p className="text-sm font-bold line-clamp-2">{course.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {course.authorName ?? "Anonymous"}
        </p>
        <p className="text-xs text-muted-foreground">
          {dayLabel} · {placeLabel}
        </p>

        {course.topics.length > 0 && (
          <div
            className="flex flex-wrap gap-1 pt-0.5"
            style={{ "--pill-fs": "0.625rem" } as React.CSSProperties}
          >
            {course.topics.map((topic) => {
              const colors = resolveTopicColors(topic);
              return (
                <LabelBadge
                  key={topic.id}
                  text={topic.nameEn}
                  background={labelBackground({ text: topic.nameEn, ...colors })}
                  color={colors.textColorHex}
                />
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
