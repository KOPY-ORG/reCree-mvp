import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSavedPostIds } from "@/lib/post-queries";
import { HScrollSection } from "@/components/curation/HScrollSection";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { fetchFollowFeed } from "../../_actions/feed-actions";
import { PostCard } from "../../_components/PostCard";

/**
 * 구독한 것들의 최신 장소 포스트 (명세 3.2 3행).
 *
 * 페이지에서 props 를 받지 않고 **스스로 조회한다.** 이 목록만 사용자마다 달라
 * 캐시가 안 되는데, 페이지의 Promise.all 에 넣으면 캐시되는 배너·지도까지
 * 이 쿼리를 기다린다. 페이지는 <Suspense> 로 감싸기만 하고 기다리지 않는다.
 *
 * 볼 게 없으면 통째로 사라진다 — 비로그인도, 구독 0건도, 구독은 했는데 글이 없는 것도
 * 화면에서는 같은 상태다. 셋을 갈라 빈 상태나 CTA 를 만들면
 * "아무것도 없다"를 세 가지 다른 모양으로 말하게 된다 (명세 5.2).
 */
export async function FollowFeedSection() {
  const { posts } = await fetchFollowFeed();
  if (posts.length === 0) return null;

  // 여기까지 왔으면 로그인 상태다 — fetchFollowFeed 가 비로그인이면 빈 결과를 준다.
  // getCurrentUser 는 요청당 캐시라 두 번 불러도 한 번만 돈다 (auth.ts:17 의 cache)
  const currentUser = await getCurrentUser();

  const [tagGroupConfigs, savedPostIds] = await Promise.all([
    prisma.tagGroupConfig.findMany({
      select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
    getSavedPostIds(currentUser?.id ?? null),
  ]);

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  return (
    <HScrollSection title="New from your follows">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} tagGroupMap={tagGroupMap} isSaved={savedPostIds.has(post.id)} />
      ))}
    </HScrollSection>
  );
}
