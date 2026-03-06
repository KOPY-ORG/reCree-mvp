"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, MapPin, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchPlaces } from "../_actions/post-actions";
import type { PlaceForForm } from "./PostForm";

interface PlacePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (place: PlaceForForm) => void;
}

export function PlacePickerSheet({
  open,
  onOpenChange,
  onSelect,
}: PlacePickerSheetProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<PlaceForForm[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sheet가 열릴 때 초기화 + 포커스
  useEffect(() => {
    if (open) {
      setKeyword("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      const data = await searchPlaces(value);
      setResults(data as PlaceForForm[]);
      setSearching(false);
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (place: PlaceForForm) => {
      onSelect(place);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <SheetTitle>장소 연결</SheetTitle>
        </SheetHeader>

        {/* 검색 인풋 */}
        <div className="px-5 py-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              placeholder="장소명으로 검색..."
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* 결과 목록 */}
        <div className="flex-1 overflow-y-auto">
          {!keyword.trim() && (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">
              장소명을 입력해 검색하세요
            </p>
          )}

          {keyword.trim() && !searching && results.length === 0 && (
            <div className="px-5 py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                일치하는 장소가 없습니다.
              </p>
              <Link
                href="/admin/places/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-2"
              >
                장소 등록하러 가기 →
              </Link>
            </div>
          )}

          {results.map((place) => (
            <div
              key={place.id}
              role="button"
              tabIndex={0}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0 cursor-pointer"
              onClick={() => handleSelect(place)}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(place)}
            >
              {/* 썸네일 */}
              <div className="shrink-0 h-12 w-12 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                {place.imageUrl ? (
                  <Image
                    src={place.imageUrl}
                    alt={place.nameKo}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{place.nameKo}</p>
                {place.nameEn && (
                  <p className="text-xs text-muted-foreground truncate">
                    {place.nameEn}
                  </p>
                )}
                {place.addressKo && (
                  <p className="text-xs text-muted-foreground truncate">
                    {place.addressKo}
                  </p>
                )}
              </div>

              {/* 연결 버튼 */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(place);
                }}
              >
                연결
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
