"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Download, Loader2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImportPreviewTable } from "./ImportPreviewTable";
import {
  fetchSheetPreview,
  importSheetRows,
  type SheetRow,
} from "../_actions/import-actions";

export function SheetImportClient() {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasPreview, setHasPreview] = useState(false);
  const [isPreviewing, startPreview] = useTransition();
  const [isImporting, startImport] = useTransition();

  const handleFetchPreview = () => {
    startPreview(async () => {
      const result = await fetchSheetPreview();
      setRows(result.rows);
      setErrors(result.errors);
      setDuplicates(result.duplicates);
      setSelectedIds(new Set());
      setHasPreview(true);

      if (result.errors.length > 0) {
        toast.warning(`유효성 오류 ${result.errors.length}건 발견`);
      }
      if (result.rows.length === 0 && result.errors.length === 0) {
        toast.info("status=완료 + review_status=채택 조건에 맞는 행이 없습니다.");
      }
    });
  };

  const handleToggle = (rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = rows
        .filter((r) => !r.isDuplicate)
        .map((r) => r.rowId);
      setSelectedIds(new Set(selectableIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleImport = () => {
    if (selectedIds.size === 0) {
      toast.error("가져올 항목을 선택해 주세요.");
      return;
    }

    startImport(async () => {
      const result = await importSheetRows(Array.from(selectedIds));

      if (result.errors.length > 0) {
        result.errors.forEach((e) => toast.error(e));
      }

      if (result.imported > 0) {
        toast.success(`${result.imported}개 항목을 가져왔습니다.`);
        const importedSet = new Set(selectedIds);
        setRows((prev) => prev.filter((r) => !importedSet.has(r.rowId)));
        setSelectedIds(new Set());
      }
    });
  };

  const newCount = rows.filter((r) => !r.isDuplicate).length;
  const duplicateCount = duplicates.length;

  return (
    <div>
      {/* 툴바 */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <Button
          onClick={handleFetchPreview}
          disabled={isPreviewing || isImporting}
          variant="outline"
          size="sm"
          className="rounded-lg bg-white shadow-sm border-0 gap-1.5"
        >
          {isPreviewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          시트 불러오기
        </Button>

        {hasPreview && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              신규{" "}
              <strong className="text-foreground tabular-nums">{newCount}</strong>
            </span>
            {duplicateCount > 0 && (
              <span>
                중복{" "}
                <strong className="tabular-nums">{duplicateCount}</strong>
              </span>
            )}
          </div>
        )}

        {hasPreview && selectedIds.size > 0 && (
          <div className="ml-auto">
            <Button
              onClick={handleImport}
              disabled={isImporting || isPreviewing}
              size="sm"
              className="rounded-lg gap-1.5"
            >
              {isImporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              선택 {selectedIds.size}개 가져오기
            </Button>
          </div>
        )}
      </div>

      {/* 유효성 오류 */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 미리보기 테이블 */}
      {hasPreview && rows.length > 0 && (
        <ImportPreviewTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />
      )}

      {/* 빈 상태 */}
      {hasPreview && rows.length === 0 && errors.length === 0 && (
        <div className="mt-6 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Info className="h-8 w-8 opacity-40" />
          <p className="text-sm">가져올 수 있는 항목이 없습니다.</p>
          <p className="text-xs opacity-70">
            시트에서 status=완료, review_status=채택인 행을 확인해 주세요.
          </p>
        </div>
      )}

      {/* 초기 상태 */}
      {!hasPreview && (
        <div className="mt-6 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Info className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            "시트 불러오기" 버튼을 눌러 데이터를 가져오세요.
          </p>
        </div>
      )}
    </div>
  );
}
