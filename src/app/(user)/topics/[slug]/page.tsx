import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopicBySlug } from "@/lib/topic-queries";
import { getPostsWithLabels, getSavedPostIds } from "@/lib/post-queries";
import { isUserFollowing, countTopicFollowers } from "@/lib/follow-queries";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { TopicHero } from "./_components/TopicHero";
import { TopicTabs } from "./_components/TopicTabs";
import { PostsGrid } from "./_components/PostsGrid";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return {};

  return {
    title: `${topic.nameEn} | reCree`,
    description: `Discover K-spots related to ${topic.nameEn} on reCree.`,
    openGraph: {
      title: `${topic.nameEn} | reCree`,
      description: `Discover K-spots related to ${topic.nameEn} on reCree.`,
    },
  };
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [followerCount, isFollowing, posts, tagGroupConfigs, savedPostIds] =
    await Promise.all([
      countTopicFollowers(topic.id),
      user ? isUserFollowing(user.id, topic.id) : Promise.resolve(false),
      getPostsWithLabels(
        { status: "PUBLISHED", postTopics: { some: { topicId: topic.id, isVisible: true } } },
        { take: 20, orderBy: { createdAt: "desc" } }
      ),
      prisma.tagGroupConfig.findMany({
        select: {
          group: true,
          displayLabel: true,
          colorHex: true,
          colorHex2: true,
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
        },
      }),
      getSavedPostIds(user?.id ?? null),
    ]);

  const tagGroupMap: TagGroupColorMap = new Map(
    tagGroupConfigs.map((c) => [c.group, c])
  );

  return (
    <div className="max-w-2xl mx-auto pb-14">
      <TopicHero
        topic={topic}
        isFollowing={isFollowing}
        isLoggedIn={!!user}
        initialFollowerCount={followerCount}
      />
      <TopicTabs>
        <PostsGrid
          posts={posts}
          tagGroupMap={tagGroupMap}
          savedPostIds={savedPostIds}
        />
      </TopicTabs>
    </div>
  );
}
