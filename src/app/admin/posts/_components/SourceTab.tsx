"use client";

import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PostSourceInput } from "../_actions/post-actions";

const SOURCE_TYPES = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "X", label: "X (Twitter)" },
  { value: "REDDIT", label: "Reddit" },
  { value: "BLOG", label: "Blog" },
  { value: "NEWS", label: "News" },
  { value: "OTHER", label: "기타" },
];

interface Props {
  sources: PostSourceInput[];
  addSource: () => void;
  removeSource: (i: number) => void;
  updateSource: (i: number, field: keyof PostSourceInput, value: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  collectedBy: string;
  setCollectedBy: (v: string) => void;
  collectedAt: string;
  setCollectedAt: (v: string) => void;
}

export function SourceTab({
  sources, addSource, removeSource, updateSource,
  memo, setMemo,
  collectedBy, setCollectedBy,
  collectedAt, setCollectedAt,
}: Props) {
  return (
    <div className="space-y-5">
      {/* 출처 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">출처</span>
          <Button type="button" variant="outline" size="sm" onClick={addSource} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            출처 추가
          </Button>
        </div>

        {sources.length === 0 && (
          <p className="text-xs text-muted-foreground">
            등록된 출처가 없습니다. 위 버튼을 눌러 추가하세요.
          </p>
        )}
        <div className="space-y-4">
          {sources.map((src, i) => (
            <div key={i} className="space-y-3">
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">출처 {i + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSource(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">출처 유형</Label>
                  <Select value={src.sourceType || ""} onValueChange={(v) => updateSource(i, "sourceType", v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">게시 날짜</Label>
                  <Input
                    value={src.sourcePostDate}
                    onChange={(e) => updateSource(i, "sourcePostDate", e.target.value)}
                    placeholder="예: 2024-01-15"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">출처 URL</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={src.sourceUrl}
                    onChange={(e) => updateSource(i, "sourceUrl", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                  {src.sourceUrl && (
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">레퍼런스 URL</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={src.referenceUrl}
                    onChange={(e) => updateSource(i, "referenceUrl", e.target.value)}
                    placeholder="https://... (선택)"
                    className="h-8 text-sm"
                  />
                  {src.referenceUrl && (
                    <a
                      href={src.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">메모</Label>
                <Input
                  value={src.sourceNote}
                  onChange={(e) => updateSource(i, "sourceNote", e.target.value)}
                  placeholder="출처에 대한 메모"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 수집 정보 */}
      <div className="space-y-3">
        <span className="text-sm font-semibold">수집 정보</span>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="collectedBy" className="text-xs">수집자</Label>
            <Input
              id="collectedBy"
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              placeholder="예: 홍길동"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collectedAt" className="text-xs">수집 날짜</Label>
            <Input
              id="collectedAt"
              value={collectedAt}
              onChange={(e) => setCollectedAt(e.target.value)}
              placeholder="예: 2024-01-15"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="memo" className="text-xs">메모 (내부용)</Label>
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            placeholder="관리자 내부 메모"
          />
        </div>
      </div>
    </div>
  );
}
