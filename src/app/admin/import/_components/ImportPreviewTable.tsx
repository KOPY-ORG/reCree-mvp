"use client";

import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { SheetRow } from "../_actions/import-actions";

interface Props {
  rows: SheetRow[];
  selectedIds: Set<string>;
  onToggle: (rowId: string) => void;
  onToggleAll: (checked: boolean) => void;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  INSTAGRAM: "인스타",
  YOUTUBE: "유튜브",
  TIKTOK: "틱톡",
  X: "X",
  REDDIT: "Reddit",
  BLOG: "블로그",
  NEWS: "뉴스",
  OTHER: "기타",
};

export function ImportPreviewTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
}: Props) {
  const selectableRows = rows.filter((r) => !r.isDuplicate);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedIds.has(r.rowId));
  const someSelected = selectableRows.some((r) => selectedIds.has(r.rowId));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => onToggleAll(!!v)}
                  aria-label="전체 선택"
                  data-state={
                    allSelected ? "checked" : someSelected ? "indeterminate" : "unchecked"
                  }
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                장소
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                제목
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                출처
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                카테고리
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.rowId}
                className={`border-b last:border-b-0 transition-colors ${
                  row.isDuplicate
                    ? "opacity-40"
                    : "hover:bg-muted/30 cursor-pointer"
                }`}
                onClick={() => {
                  if (!row.isDuplicate) onToggle(row.rowId);
                }}
              >
                {/* 체크박스 */}
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedIds.has(row.rowId)}
                    disabled={row.isDuplicate}
                    onCheckedChange={() => {
                      if (!row.isDuplicate) onToggle(row.rowId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${row.placeName} 선택`}
                  />
                </td>

                {/* 장소 */}
                <td className="px-4 py-3 min-w-[140px]">
                  <div className="font-medium">{row.placeName || "—"}</div>
                  {row.googleMapsLink && (
                    <a
                      href={row.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground mt-0.5"
                    >
                      지도 보기
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>

                {/* 제목 */}
                <td className="px-4 py-3 min-w-[180px]">
                  {row.title ? (
                    <span>{row.title}</span>
                  ) : (
                    <span className="text-muted-foreground/50 text-xs">
                      [AI 생성 예정]
                    </span>
                  )}
                  {row.subTitle && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                      {row.subTitle}
                    </div>
                  )}
                </td>

                {/* 출처 */}
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    {row.sourceType && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {SOURCE_TYPE_LABELS[row.sourceType] ?? row.sourceType}
                      </span>
                    )}
                    {row.sourceUrl && (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {row.sourceNote && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]">
                      {row.sourceNote}
                    </div>
                  )}
                </td>

                {/* 카테고리 */}
                <td className="px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    {row.category || "—"}
                  </div>
                  {row.artistWork && (
                    <div className="text-xs text-muted-foreground/70 mt-0.5 truncate max-w-[120px]">
                      {row.artistWork}
                    </div>
                  )}
                </td>

                {/* 상태 */}
                <td className="px-4 py-3">
                  {row.isDuplicate ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      중복
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      신규
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
