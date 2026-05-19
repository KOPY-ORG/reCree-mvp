"use client";

import { useRouter } from "next/navigation";

type TopicLabelLinkProps = {
  slug: string;
  text: string;
  background: string;
  color: string;
};

export function TopicLabelLink({ slug, text, background, color }: TopicLabelLinkProps) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/topics/${slug}`);
  }

  return (
    <span
      role="link"
      tabIndex={0}
      className="pill-badge cursor-pointer"
      style={{ background, color }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/topics/${slug}`);
        }
      }}
    >
      {text}
    </span>
  );
}
