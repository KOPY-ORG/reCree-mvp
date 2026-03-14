export const STOP_WORDS = new Set([
  "in", "at", "the", "a", "an", "of", "for", "to", "and", "or",
  "is", "are", "was", "were", "be", "been", "by", "with", "from",
  "on", "as", "near", "around",
]);

export function parseSearchWords(q: string): string[] {
  const all = q.trim().split(/\s+/).filter(Boolean);
  const filtered = all.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  return filtered.length > 0 ? filtered : all;
}
