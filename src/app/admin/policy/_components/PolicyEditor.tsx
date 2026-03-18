"use client";

import { useState, useTransition } from "react";
import { savePolicy } from "../_actions/policy-actions";
import { toast } from "sonner";

interface PolicyData {
  id: string;
  content: string;
  updatedAt: Date;
}

interface Props {
  terms: PolicyData | null;
  privacy: PolicyData | null;
}

const TABS = [
  { id: "terms" as const, label: "이용약관" },
  { id: "privacy" as const, label: "개인정보처리방침" },
];

export function PolicyEditor({ terms, privacy }: Props) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [termsContent, setTermsContent] = useState(terms?.content ?? "");
  const [privacyContent, setPrivacyContent] = useState(privacy?.content ?? "");
  const [isPending, startTransition] = useTransition();

  const currentContent = activeTab === "terms" ? termsContent : privacyContent;
  const setCurrentContent = activeTab === "terms" ? setTermsContent : setPrivacyContent;
  const currentData = activeTab === "terms" ? terms : privacy;

  function handleSave() {
    startTransition(async () => {
      await savePolicy(activeTab, currentContent);
      toast.success("저장되었습니다.");
    });
  }

  return (
    <div className="space-y-0">
      {/* 탭 + 저장 버튼 헤더 */}
      <div className="flex items-end justify-between border-b border-zinc-200">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 pb-2">
          {currentData && (
            <span className="text-xs text-zinc-400">
              최종 수정:{" "}
              {currentData.updatedAt.toLocaleDateString("ko-KR")}{" "}
              {currentData.updatedAt.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-8 px-4 bg-zinc-900 text-white text-sm font-medium rounded-md disabled:opacity-40 hover:bg-zinc-700 transition-colors"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="bg-white rounded-b-xl border border-t-0 border-zinc-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 bg-zinc-50">
          <span className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">Markdown</span>
          <span className="text-zinc-300">·</span>
          <span className="text-[11px] text-zinc-400">
            {currentContent.length.toLocaleString()}자
          </span>
        </div>
        <textarea
          value={currentContent}
          onChange={(e) => setCurrentContent(e.target.value)}
          className="w-full h-[calc(100vh-240px)] px-5 py-4 text-sm text-zinc-800 font-mono leading-relaxed resize-none focus:outline-none"
          placeholder={`${activeTab === "terms" ? "이용약관" : "개인정보처리방침"} 내용을 Markdown으로 입력하세요...`}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
