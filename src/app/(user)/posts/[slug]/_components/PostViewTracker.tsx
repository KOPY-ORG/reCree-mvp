"use client";

import { useEffect } from "react";
import { incrementPostView } from "@/app/(user)/_actions/post-interaction-actions";

interface Props {
  postId: string;
}

export function PostViewTracker({ postId }: Props) {
  useEffect(() => {
    incrementPostView(postId);
  }, [postId]);

  return null;
}
