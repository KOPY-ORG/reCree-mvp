"use client";

import dynamic from "next/dynamic";
import { visit } from "unist-util-visit";
import type { Element, Root } from "hast";

const MDPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
  loading: () => <div className="animate-pulse h-24 bg-muted rounded-md" />,
});

// 표준 HTML 요소가 아닌 커스텀 태그를 자식 노드로 unwrap
const KNOWN_BLOCK_ELEMENTS = new Set([
  "a", "abbr", "address", "article", "aside", "audio", "b", "blockquote", "br",
  "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist",
  "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header",
  "hr", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link",
  "main", "mark", "math", "menu", "meter", "nav", "noscript", "object", "ol", "optgroup",
  "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s",
  "samp", "section", "select", "small", "source", "span", "strong", "sub", "summary",
  "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time",
  "tr", "track", "u", "ul", "var", "video", "wbr", "svg", "path", "circle", "rect",
  "line", "polyline", "polygon", "ellipse", "g", "defs", "use", "text", "tspan",
]);

function rehypeRemoveUnknownElements() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (!KNOWN_BLOCK_ELEMENTS.has(node.tagName)) {
        parent.children.splice(index, 1, ...node.children);
        return index; // 같은 위치 재방문
      }
    });
  };
}

const REHYPE_PLUGINS: [() => (tree: Root) => void] = [rehypeRemoveUnknownElements];

interface Props {
  source: string;
}

export function MarkdownContent({ source }: Props) {
  return (
    <div data-color-mode="light" className="post-body">
      <MDPreview
        source={source}
        style={{ background: "transparent" }}
        rehypePlugins={REHYPE_PLUGINS}
      />
    </div>
  );
}
