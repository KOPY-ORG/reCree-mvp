import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { getMyFollows } from "@/lib/follow-queries";
import { resolveTopicColors, labelBackground } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { TopicsHeader } from "./_components/TopicsHeader";
import {
  TopicsBrowser,
  type TopicGroup,
  type TopicItem,
} from "./_components/TopicsBrowser";

type L0Topic = Awaited<ReturnType<typeof getLevel0TopicsDeep>>[number];
type L1Topic = L0Topic["children"][number];
type L2Topic = L1Topic["children"][number];

/**
 * 색은 반드시 resolveTopicColors 를 통한다. L2 34개 중 13개는 colorHex 가 null 이고
 * 그 값은 L1·L0 에서 내려온다 — l2.colorHex 를 직접 읽으면 그 열셋이 회색이 된다.
 */
function buildItem(
  l2: L2Topic,
  l1: L1Topic,
  l0: L0Topic,
  groupLabel: string,
): TopicItem {
  const resolved = resolveTopicColors({ ...l2, parent: { ...l1, parent: l0 } });
  return {
    id: l2.id,
    nameEn: l2.nameEn,
    background: labelBackground({ text: l2.nameEn, ...resolved }),
    groupLabel,
  };
}

export default async function TopicsPage() {
  const [l0Topics, user] = await Promise.all([
    getLevel0TopicsDeep(),
    getCurrentUser(),
  ]);

  // 표시 대상은 예전과 같다 — K-POP 은 L1 을 접어 한 덩어리, K-CONTENT 는 L1 별로.
  // 여기를 넓히면 Creator L0 같은 것이 새로 나타난다. 이 화면이 무엇을 보여 주는지는
  // 이번 작업에서 바꾸지 않는다.
  const kpop = l0Topics.find((t) => t.nameEn === "K-POP");
  const kcontent = l0Topics.find((t) => t.nameEn === "K-CONTENT");

  const groups: TopicGroup[] = [];

  if (kpop) {
    const topics = kpop.children.flatMap((l1) =>
      l1.children.map((l2) => buildItem(l2, l1, kpop, kpop.nameEn)),
    );
    if (topics.length > 0)
      groups.push({ id: kpop.id, label: kpop.nameEn, topics });
  }

  if (kcontent) {
    for (const l1 of kcontent.children) {
      if (l1.children.length === 0) continue;
      groups.push({
        id: l1.id,
        label: l1.nameEn,
        topics: l1.children.map((l2) => buildItem(l2, l1, kcontent, l1.nameEn)),
      });
    }
  }

  const shownIds = new Set(groups.flatMap((g) => g.topics.map((t) => t.id)));

  // 순서가 필요해 getFollowedTopicIds 대신 getMyFollows 를 쓴다 — 저쪽은 Set 이라
  // 사용자가 정한 순서를 잃는다. 정렬은 sortOrder asc (follow-queries.ts:51).
  const follows = user ? await getMyFollows(user.id) : [];
  const followedIds: string[] = [];
  const hiddenFollowIds: string[] = [];
  for (const follow of follows) {
    (shownIds.has(follow.topic.id) ? followedIds : hiddenFollowIds).push(
      follow.topic.id,
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-14">
      <TopicsHeader />
      <TopicsBrowser
        groups={groups}
        initialFollowedIds={followedIds}
        hiddenFollowIds={hiddenFollowIds}
        isLoggedIn={!!user}
      />
    </div>
  );
}
