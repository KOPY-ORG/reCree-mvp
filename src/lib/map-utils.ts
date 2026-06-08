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

export type MarkerGradient = {
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
};

type TopicGradientNode = {
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  parent?: TopicGradientNode | null;
};
type TopicGradientPost = { topics: TopicGradientNode[] };

function resolveTopicGradient(t: TopicGradientNode): MarkerGradient | null {
  if (t.colorHex) {
    return { colorHex: t.colorHex, colorHex2: t.colorHex2, gradientDir: t.gradientDir, gradientStop: t.gradientStop };
  }
  return t.parent ? resolveTopicGradient(t.parent) : null;
}

export function getTopicMarkerGradient(posts: TopicGradientPost[]): MarkerGradient | undefined {
  const sorted = [...posts].sort((a, b) =>
    (b.topics.length > 0 ? 1 : 0) - (a.topics.length > 0 ? 1 : 0)
  );
  for (const post of sorted) {
    for (const topic of post.topics) {
      const gradient = resolveTopicGradient(topic);
      if (gradient) return gradient;
    }
  }
  return undefined;
}

type TopicIdNode = { id: string; parent?: TopicIdNode | null };

export function topicMatchesFilter(topic: TopicIdNode, topicId: string): boolean {
  return (
    topic.id === topicId ||
    topic.parent?.id === topicId ||
    topic.parent?.parent?.id === topicId ||
    topic.parent?.parent?.parent?.id === topicId
  );
}

export function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function gradientDirToSvgCoords(dir: string): { x1: number; y1: number; x2: number; y2: number } {
  switch (dir.trim()) {
    case "to bottom":       return { x1: 0, y1: 0, x2: 0, y2: 1 };
    case "to top":          return { x1: 0, y1: 1, x2: 0, y2: 0 };
    case "to right":        return { x1: 0, y1: 0, x2: 1, y2: 0 };
    case "to left":         return { x1: 1, y1: 0, x2: 0, y2: 0 };
    case "to bottom right": return { x1: 0, y1: 0, x2: 1, y2: 1 };
    case "to bottom left":  return { x1: 1, y1: 0, x2: 0, y2: 1 };
    case "to top right":    return { x1: 0, y1: 1, x2: 1, y2: 0 };
    case "to top left":     return { x1: 1, y1: 1, x2: 0, y2: 0 };
    default:                return { x1: 0, y1: 0, x2: 0, y2: 1 };
  }
}
