"use client";

import Link from "next/link";
import { FollowButton } from "@/app/(user)/_components/FollowButton";

interface Props {
  topicId: string;
  topicName: string;
  slug: string;
  background: string;
  textColor: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}

export function TopicCard({
  topicId,
  topicName,
  slug,
  background,
  textColor,
  initialFollowing,
  isLoggedIn,
}: Props) {
  return (
    <Link
      href={`/topics/${slug}`}
      className="rounded-2xl overflow-hidden block"
      style={{ background }}
    >
      <div className="aspect-[4/3] flex flex-col justify-between p-3">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: textColor }}>
          {topicName}
        </p>
        <div
          role="none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FollowButton
            topicId={topicId}
            topicName={topicName}
            initialFollowing={initialFollowing}
            isLoggedIn={isLoggedIn}
            variant="compact"
          />
        </div>
      </div>
    </Link>
  );
}
