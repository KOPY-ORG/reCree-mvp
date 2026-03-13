"use client";

import { useState, useEffect } from "react";
import { Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PostSourceInput } from "../_actions/post-actions";

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: "YOUTUBE",   label: "YouTube" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "X",         label: "X (Twitter)" },
  { value: "PINTEREST", label: "Pinterest" },
  { value: "BLOG",      label: "Blog" },
  { value: "ARTICLE",   label: "기사/뉴스" },
  { value: "OTHER",     label: "기타" },
];

// ─── URL → platform 자동감지 ───────────────────────────────────────────────────

function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YOUTUBE";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "X";
    if (hostname.includes("instagram.com")) return "INSTAGRAM";
    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) return "PINTEREST";
    if (
      hostname.includes("naver.com") ||
      hostname.includes("tistory.com") ||
      hostname.includes("velog.io") ||
      hostname.includes("brunch.co.kr")
    ) return "BLOG";
    return "OTHER";
  } catch {
    return "";
  }
}

// ─── 출처 카드 ─────────────────────────────────────────────────────────────────

function SourceCard({
  index,
  source,
  onRemove,
  onUpdate,
}: {
  index: number;
  source: PostSourceInput;
  onRemove: () => void;
  onUpdate: (patch: Partial<PostSourceInput>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const detectedPlatform = source.url ? detectPlatform(source.url) : "";

  // 기존 소스에 platform이 비어있고 URL에서 감지 가능하면 자동 세팅
  useEffect(() => {
    if (!source.platform && source.url) {
      const detected = detectPlatform(source.url);
      if (detected) onUpdate({ platform: detected });
    }
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUrlChange(url: string) {
    const detected = detectPlatform(url);
    onUpdate({ url, ...(detected ? { platform: detected } : {}) });
  }

  function handleCopy() {
    if (!source.url) return;
    navigator.clipboard.writeText(source.url).then(() => {
      setCopied(true);
      toast.success("URL이 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">출처 {index + 1}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            source.sourceType === "PRIMARY"
              ? "bg-blue-100 text-blue-700"
              : "bg-zinc-100 text-zinc-600"
          }`}>
            {source.sourceType === "PRIMARY" ? "공식" : "참고"}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <Label className="text-xs">URL <span className="text-destructive">*</span></Label>
        <div className="flex gap-1.5">
          <Input
            value={source.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://..."
            className="h-8 text-sm"
          />
          {source.url && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-colors"
                title="URL 복사"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          )}
        </div>
        {detectedPlatform && (
          <p className="text-[11px] text-muted-foreground">
            자동감지:{" "}
            <span className="font-medium text-foreground">
              {PLATFORMS.find((p) => p.value === detectedPlatform)?.label ?? detectedPlatform}
            </span>
            {source.platform === detectedPlatform && (
              <span className="ml-1 text-green-600">✓</span>
            )}
          </p>
        )}
      </div>

      {/* 플랫폼 + 유형 + 게시일 — 한 행 */}
      <div className="flex items-end gap-3">
        <div className="space-y-1.5 w-36 shrink-0">
          <Label className="text-xs">플랫폼</Label>
          <Select
            value={source.platform || ""}
            onValueChange={(v) => onUpdate({ platform: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 shrink-0">
          <Label className="text-xs">유형</Label>
          <div className="flex items-center gap-4 h-8">
            {(["PRIMARY", "REFERENCE"] as const).map((v) => (
              <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`sourceType-${index}`}
                  value={v}
                  checked={source.sourceType === v}
                  onChange={() => onUpdate({ sourceType: v })}
                  className="accent-zinc-900"
                />
                <span className="text-sm">{v === "PRIMARY" ? "공식" : "참고"}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 w-36 shrink-0">
          <Label className="text-xs">게시일</Label>
          <Input
            type="date"
            value={source.sourcePostDate}
            onChange={(e) => onUpdate({ sourcePostDate: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 메모 — 단독 full-width */}
      <div className="space-y-1.5">
        <Label className="text-xs">메모</Label>
        <Input
          value={source.sourceNote}
          onChange={(e) => onUpdate({ sourceNote: e.target.value })}
          placeholder="선택 입력"
          className="h-8 text-sm w-full"
        />
      </div>

    </div>
  );
}

// ─── SourceTab ─────────────────────────────────────────────────────────────────

interface Props {
  sources: PostSourceInput[];
  addSource: () => void;
  removeSource: (i: number) => void;
  updateSource: (i: number, patch: Partial<PostSourceInput>) => void;
}

export function SourceTab({
  sources,
  addSource,
  removeSource,
  updateSource,
}: Props) {
  return (
    <div className="space-y-5">
      {/* 출처 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">출처</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSource}
            className="h-7 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            출처 추가
          </Button>
        </div>

        {sources.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center border rounded-lg bg-muted/30">
            등록된 출처가 없습니다. 위 버튼을 눌러 추가하세요.
          </p>
        ) : (
          <div className="space-y-3">
            {sources.map((src, i) => (
              <SourceCard
                key={i}
                index={i}
                source={src}
                onRemove={() => removeSource(i)}
                onUpdate={(patch) => updateSource(i, patch)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
