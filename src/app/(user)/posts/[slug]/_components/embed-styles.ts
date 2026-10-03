// 외부 임베드(YouTubeEmbed · SocialEmbed) 공통 클래스

/** 플레이어 · 카드가 뜨기 전 그 자리를 덮는 스켈레톤 (부모가 relative) */
export const EMBED_SKELETON_OVERLAY = "absolute inset-0 rounded-none";

/** 카드가 준비되면 보이게 하는 전환 — opacity-0 / opacity-100 과 함께 쓴다 */
export const EMBED_FADE = "transition-opacity duration-200 ease-out";
