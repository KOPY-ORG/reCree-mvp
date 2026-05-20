"use client";

import dynamic from "next/dynamic";

interface Props {
  currentSearch: string;
  currentStatus: string;
  currentSort: string;
}

const PostsFiltersInner = dynamic(
  () => import("./PostsFiltersInner").then((m) => m.PostsFiltersInner),
  { ssr: false },
);

export function PostsFilters(props: Props) {
  return <PostsFiltersInner {...props} />;
}
