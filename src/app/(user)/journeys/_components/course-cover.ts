// 코스 커버·핀 색 — 목록 카드와 상세 배너가 같은 규칙을 쓰도록 한 곳에 둔다.
import { DEFAULT_COLOR, DEFAULT_TEXT, labelBackground, resolveTopicColors } from "@/lib/post-labels";
import type { CourseListItem } from "@/lib/course-queries";

/** CourseListItem·CourseDetail 이 같은 CourseTopicLabel[] 을 쓴다 */
type CourseTopics = CourseListItem["topics"];

/** Topic이 하나도 없을 때 — DEFAULT_COLOR에서 background/light로 떨어지는 중립 그라데이션 */
export const NEUTRAL_COVER = `linear-gradient(to bottom, ${DEFAULT_COLOR}, #F3F3F3)`;

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
export function coverBackground(topics: CourseTopics): string {
  if (topics.length === 0) return NEUTRAL_COVER;

  const resolved = topics.map((topic) => resolveTopicColors(topic));

  // 단일 Topic은 배지와 같은 배경을 쓴다 — 그라데이션 문자열 조립을 중복하지 않는다
  if (resolved.length === 1) return labelBackground({ text: "", ...resolved[0] });

  return `linear-gradient(${resolved[0].gradientDir}, ${resolved.map((c) => c.colorHex).join(", ")})`;
}

/**
 * 미니맵 핀 색 — 코스의 첫 Topic. Topic이 없으면 중립색.
 * 숫자 색을 같은 Topic의 textColorHex에서 가져와야 밝은 커버에서도 읽힌다.
 */
export function pinColors(topics: CourseTopics): { fill: string; text: string } {
  if (topics.length === 0) return { fill: DEFAULT_COLOR, text: DEFAULT_TEXT };
  const resolved = resolveTopicColors(topics[0]);
  return { fill: resolved.colorHex, text: resolved.textColorHex };
}
