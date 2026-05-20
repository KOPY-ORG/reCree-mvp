import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import { getFollowedTopicIds } from "@/lib/follow-queries";
import { resolveTopicColors, labelBackground } from "@/lib/post-labels";
import { getCurrentUser } from "@/lib/auth";
import { TopicCard } from "./_components/TopicCard";
import { TopicsHeader } from "./_components/TopicsHeader";

type L0Topic = Awaited<ReturnType<typeof getLevel0TopicsDeep>>[number];
type L1Topic = L0Topic["children"][number];
type L2Topic = L1Topic["children"][number];

type CardData = {
  id: string;
  nameEn: string;
  slug: string;
  background: string;
  textColor: string;
};

function buildCard(l2: L2Topic, l1: L1Topic, l0: L0Topic): CardData {
  const resolved = resolveTopicColors({ ...l2, parent: { ...l1, parent: l0 } });
  return {
    id: l2.id,
    nameEn: l2.nameEn,
    slug: l2.slug,
    background: labelBackground({ text: l2.nameEn, ...resolved }),
    textColor: resolved.textColorHex,
  };
}

export default async function TopicsPage() {
  const [l0Topics, user] = await Promise.all([
    getLevel0TopicsDeep(),
    getCurrentUser(),
  ]);

  const kpop = l0Topics.find((t) => t.nameEn === "K-POP");
  const kcontent = l0Topics.find((t) => t.nameEn === "K-CONTENT");

  const kpopCards: CardData[] = kpop
    ? kpop.children.flatMap((l1) => l1.children.map((l2) => buildCard(l2, l1, kpop)))
    : [];

  type Section = { id: string; nameEn: string; cards: CardData[] };
  const kcontentSections: Section[] = kcontent
    ? kcontent.children
        .filter((l1) => l1.children.length > 0)
        .map((l1) => ({
          id: l1.id,
          nameEn: l1.nameEn,
          cards: l1.children.map((l2) => buildCard(l2, l1, kcontent)),
        }))
    : [];

  const allIds = [
    ...kpopCards.map((t) => t.id),
    ...kcontentSections.flatMap((s) => s.cards.map((t) => t.id)),
  ];

  const followedIds = user
    ? new Set(await getFollowedTopicIds(user.id, allIds))
    : new Set<string>();

  return (
    <div className="max-w-2xl mx-auto pb-14">
      <TopicsHeader />
      <div className="px-4 pt-4">

      {kpopCards.length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold text-base mb-3">K-POP</h2>
          <div className="grid grid-cols-2 gap-3">
            {kpopCards.map((t) => (
              <TopicCard
                key={t.id}
                topicId={t.id}
                topicName={t.nameEn}
                slug={t.slug}
                background={t.background}
                textColor={t.textColor}
                initialFollowing={followedIds.has(t.id)}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        </section>
      )}

      {kcontentSections.map((section) => (
        <section key={section.id} className="mb-8">
          <h2 className="font-bold text-base mb-3">{section.nameEn}</h2>
          <div className="grid grid-cols-2 gap-3">
            {section.cards.map((t) => (
              <TopicCard
                key={t.id}
                topicId={t.id}
                topicName={t.nameEn}
                slug={t.slug}
                background={t.background}
                textColor={t.textColor}
                initialFollowing={followedIds.has(t.id)}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        </section>
      ))}
      </div>
    </div>
  );
}
