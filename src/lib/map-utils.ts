// 마커 색상 유틸 — 클라이언트/서버 양쪽에서 사용 가능 (Prisma 의존성 없음)

type TopicColorNode = { colorHex: string | null; parent?: TopicColorNode | null };
type TopicPost = { topics: TopicColorNode[] };

function resolveTopicColorHex(t: TopicColorNode): string | null {
  return t.colorHex ?? (t.parent ? resolveTopicColorHex(t.parent) : null);
}

export function getTopicMarkerColor(posts: TopicPost[]): string | undefined {
  const sorted = [...posts].sort((a, b) =>
    (b.topics.length > 0 ? 1 : 0) - (a.topics.length > 0 ? 1 : 0)
  );
  for (const post of sorted) {
    for (const topic of post.topics) {
      const color = resolveTopicColorHex(topic);
      if (color) return color;
    }
  }
  return undefined;
}
