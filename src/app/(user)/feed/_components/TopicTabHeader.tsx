import { FollowButton } from "@/app/(user)/_components/FollowButton";
import { resolveTopicColors, labelBackground } from "@/lib/post-labels";
import type { FollowWithTopic } from "@/lib/follow-queries";

type NamedNode = { nameEn?: string | null; parent?: NamedNode | null };

/**
 * 조상 중 맨 위의 이름 — K-POP · K-CONTENT · Creator (level 0).
 *
 * 바로 위(Boy Group · K-Drama)를 쓰지 않는다. 그 단계는 8갈래로 잘게 나뉘어
 * "이 토픽이 어느 세계의 것인가"를 말해 주지 못한다. BTS 옆에 붙어야 할 말은
 * Boy Group 이 아니라 K-POP 이다.
 *
 * level 을 보지 않고 체인 끝까지 올라간다 — 구독이 level 2 라는 보장이 코드에
 * 없고, 있더라도 그 가정은 조용히 깨진다. 끝까지 가면 어느 깊이든 맨 위가 나온다.
 */
function rootCategoryName(node: NamedNode | null | undefined): string | null {
  if (!node) return null;
  return rootCategoryName(node.parent) ?? node.nameEn ?? null;
}

/**
 * 토픽 탭의 머리 — 지금 어느 토픽을 보고 있는지와, 구독을 끊는 길.
 *
 * 탭바는 이름을 8.5rem 에서 자른다 (HomeTabBar.tsx:79). 온전한 이름이 처음 나오는
 * 자리가 여기다.
 *
 * 색 조각은 TopicsBrowser 의 TopicAvatar 와 같은 관례다 — 글자를 얹지 않는다.
 * 바로 옆이 토픽 이름이라 같은 것을 두 번 말하게 되고, 색이 그 토픽의 고유 속성이라는
 * 것이 글자 없이 더 분명하게 읽힌다. 여기서 정하는 것은 크기와 모양뿐이고
 * 색은 전부 DB 에서 온다.
 *
 * 이 탭은 구독한 토픽으로만 열린다 (feed-tabs.ts:19). 그래서 로그인 여부를 묻지 않고,
 * 버튼도 항상 Following 으로 시작한다 — 눌러서 구독을 끊으면 다음 렌더에서 탭 자체가
 * 사라지고 Hot 으로 떨어진다.
 */
export function TopicTabHeader({ topic }: { topic: FollowWithTopic["topic"] }) {
  const resolved = resolveTopicColors(topic);
  const background = labelBackground({ text: topic.nameEn, ...resolved });
  const category = rootCategoryName(topic.parent);

  return (
    <header className="flex items-center gap-3 px-4 pt-4 pb-5">
      <span aria-hidden className="size-12 flex-none rounded-xl" style={{ background }} />

      {/* min-w-0 이 없으면 긴 이름이 flex 기본 min-content 에 걸려 버튼을 밀어낸다 */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold leading-tight">{topic.nameEn}</h1>
        {category && <p className="truncate text-[13px] text-muted-foreground">{category}</p>}
      </div>

      {/* 여기서 끊으면 보고 있던 탭이 통째로 사라지므로 한 번 되묻는다 */}
      <FollowButton
        topicId={topic.id}
        topicName={topic.nameEn}
        initialFollowing
        isLoggedIn
        variant="compact"
        confirmUnfollow
      />
    </header>
  );
}
