"use client";

import { useState } from "react";
import { FollowButton } from "@/app/(user)/_components/FollowButton";
import { resolveTopicColors, labelBackground } from "@/lib/post-labels";
import type { TopicDetail } from "@/lib/topic-queries";

type TopicHeroProps = {
  topic: TopicDetail;
  isFollowing: boolean;
  isLoggedIn: boolean;
  initialFollowerCount: number;
};

export function TopicHero({ topic, isFollowing, isLoggedIn, initialFollowerCount }: TopicHeroProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  const resolved = resolveTopicColors(topic);
  const background = labelBackground({ text: topic.nameEn, ...resolved });

  return (
    <>
      <section
        className="flex flex-col justify-end px-4 pt-14 pb-5 h-[200px] md:h-[240px]"
        style={{ background, color: resolved.textColorHex }}
      >
        <h1 className="text-3xl font-bold mb-4">{topic.nameEn}</h1>
        <FollowButton
          topicId={topic.id}
          topicName={topic.nameEn}
          initialFollowing={isFollowing}
          isLoggedIn={isLoggedIn}
          onChange={(following) =>
            setFollowerCount((prev) => prev + (following ? 1 : -1))
          }
        />
      </section>
      <div className="px-4 py-3 text-sm text-muted-foreground">
        {followerCount.toLocaleString()} followers
      </div>
    </>
  );
}
