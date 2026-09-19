import Link from "next/link";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, resolveTopicColors } from "@/lib/post-labels";
import { coverBackground } from "./course-cover";
import type { CourseListItem } from "@/lib/course-queries";

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
