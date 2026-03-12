"use client";

import dynamic from "next/dynamic";

const MDPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
  loading: () => <div className="animate-pulse h-24 bg-muted rounded-md" />,
});

interface Props {
  source: string;
}

export function MarkdownContent({ source }: Props) {
  return (
    <div data-color-mode="light" className="post-body">
      <MDPreview
        source={source}
        style={{ background: "transparent" }}
      />
    </div>
  );
}
