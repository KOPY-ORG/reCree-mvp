"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PolicyContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-2 text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mt-8 mb-2 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-4 mb-1 text-foreground">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
        ),
        hr: () => <hr className="my-6 border-border" />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left py-2 pr-4 text-xs font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="py-2 pr-4 text-xs text-muted-foreground border-b border-border/50">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border pl-4 text-muted-foreground">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
