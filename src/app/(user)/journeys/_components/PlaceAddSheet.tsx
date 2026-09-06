"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { isExternalImage } from "@/lib/image";
import { getPopularPlaces, searchPlaces } from "@/app/(user)/_actions/recreeshot-actions";
import {
  getNearbyCourseAttractions,
  getSavedCoursePlaces,
  type CoursePlaceOption,
} from "@/app/(user)/_actions/course-actions";
import { CHIP_BG, INK, LINE, MUTED, PAPER, SUB } from "../_constants";

// ─── 상수 ────────────────────────────────────────────────────────────────────

/** StickerPanel.tsx:207 이 같은 searchPlaces 에 쓰는 값 */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * 한국관광공사 출처 표기. 텍스트만 쓴다 — 로고 이미지는 쓸 수 없다.
 * UI 문구는 영어로 쓰지만 이 표기만은 규정된 한글 문구를 그대로 둔다.
 */
const TOUR_API_ATTRIBUTION = "출처: ⓒ한국관광공사";

const TABS = [
  { id: "search", label: "Search places" },
  { id: "saved", label: "Saved Places" },
  { id: "nearby", label: "Nearby Attractions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── 타입 ────────────────────────────────────────────────────────────────────

/**
 * 시트가 골라 올려 보내는 장소.
 * placeId 가 있으면 우리 Place, 없으면 관광 데이터(external)다 — addCourseItem 의 두 갈래와 같다.
 */
export type PickedPlace = {
  placeId: string | null;
  nameEn: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
};

/** 목록 한 줄. key 는 렌더용이고 그 밖은 그대로 PickedPlace 가 된다. */
type Row = PickedPlace & { key: string };

interface PlaceAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 헤더에 쓸 Day 번호 */
  dayNumber: number;
  /** 이 Day 에 이미 담긴 Place id — 같은 Day 중복은 서버가 막는다(invalid_input) */
  existingPlaceIds: string[];
  /** Nearby 기준 좌표. 없으면 그 탭은 안내만 띄운다 */
  anchor: { lat: number; lng: number; label: string } | null;
  /** 이 Day 에 더 담을 수 있는 개수 */
  remainingSlots: number;
  onPick: (place: PickedPlace) => void;
}

// ─── 변환 ────────────────────────────────────────────────────────────────────

/** searchPlaces / getPopularPlaces 결과 → 한 줄 */
function placeToRow(place: {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}): Row {
  return {
    key: place.id,
    placeId: place.id,
    // Place.nameEn 은 nullable 인데 CourseItem.nameEn 은 NOT NULL — addCourseItem 과 같은 폴백이다
    nameEn: place.nameEn?.trim() || place.nameKo,
    address: place.addressEn?.trim() || place.city,
    latitude: place.latitude,
    longitude: place.longitude,
    imageUrl: place.imageUrl,
  };
}

function savedToRow(place: CoursePlaceOption): Row {
  return {
    key: place.id,
    placeId: place.id,
    nameEn: place.nameEn,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    imageUrl: place.imageUrl,
  };
}

// ─── 한 줄 ───────────────────────────────────────────────────────────────────

function PlaceRow({
  row,
  added,
  disabled,
  onPick,
}: {
  row: Row;
  added: boolean;
  disabled: boolean;
  onPick: (row: Row) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(row)}
      disabled={added || disabled}
      className="flex w-full items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors active:bg-muted disabled:active:bg-transparent"
    >
      {row.imageUrl ? (
        /* unoptimized 판정은 StickerPanel.tsx:594 와 같다 — 등록되지 않은 호스트를
           next/image 에 그대로 넘기면 이미지 하나가 아니라 시트 전체가 죽는다.
           (Place.placeImages 에 search.pstatic.net 이 실제로 한 건 있다) */
        <Image
          src={row.imageUrl}
          alt=""
          width={44}
          height={44}
          unoptimized={isExternalImage(row.imageUrl)}
          className="size-11 flex-none rounded-xl object-cover"
          style={{ background: CHIP_BG }}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-11 flex-none items-center justify-center rounded-xl"
          style={{ background: CHIP_BG }}
        >
          <MapPin className="size-4" style={{ color: SUB }} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-medium leading-[1.3]"
          style={{ color: added ? SUB : INK }}
        >
          {row.nameEn}
        </span>
        {row.address && (
          <span
            className="mt-[5px] block truncate text-[11px] font-medium leading-[1.2]"
            style={{ color: SUB }}
          >
            {row.address}
          </span>
        )}
      </span>

      {/* 이미 담긴 줄은 사라지지 않고 자리에 남는다 — 목록이 흔들리지 않고,
          방금 뭘 담았는지 눈으로 확인된다 */}
      <span
        aria-hidden
        className="flex size-8 flex-none items-center justify-center rounded-full"
        style={{ background: added ? PAPER : INK, opacity: disabled && !added ? 0.3 : 1 }}
      >
        {added ? (
          <Check className="size-4" style={{ color: SUB }} strokeWidth={2.6} />
        ) : (
          <Plus className="size-4" style={{ color: "var(--brand)" }} strokeWidth={2.6} />
        )}
      </span>
    </button>
  );
}

// ─── 상태 표시 ───────────────────────────────────────────────────────────────

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">{children}</div>
  );
}

function Loading() {
  return (
    <Centered>
      <Loader2 className="size-5 animate-spin" style={{ color: SUB }} />
    </Centered>
  );
}

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <Centered>
      <p className="text-[13px] font-medium leading-[1.3]" style={{ color: INK }}>
        {title}
      </p>
      {body && (
        <p className="text-[11.5px] font-medium leading-[1.45]" style={{ color: MUTED }}>
          {body}
        </p>
      )}
    </Centered>
  );
}

// ─── PlaceAddSheet ───────────────────────────────────────────────────────────

/**
 * 장소 추가 바텀시트. 탭 3개를 한 시트에 둔다.
 *
 * 고른 장소는 위로 올려 보내기만 하고 저장은 편집기가 한다 —
 * 초안이면 로컬 배열에 쌓이고, 이미 있는 코스면 바로 addCourseItem 이 나간다.
 *
 * 고른 뒤 시트를 닫지 않는다. 코스를 짤 때는 한 번에 여러 곳을 담는 게 보통이라
 * 매번 닫았다 여는 것이 더 번거롭다. 담은 줄은 체크 표시로 바뀌어 자리에 남는다.
 */
export function PlaceAddSheet({
  open,
  onOpenChange,
  dayNumber,
  existingPlaceIds,
  anchor,
  remainingSlots,
  onPick,
}: PlaceAddSheetProps) {
  const [tab, setTab] = useState<TabId>("search");
  const [query, setQuery] = useState("");

  // 탭 1
  const [popular, setPopular] = useState<Row[] | null>(null);
  const [results, setResults] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);

  // 탭 2
  const [saved, setSaved] = useState<Row[] | null>(null);

  // 탭 3 — null 은 "아직 안 불러옴", "failed" 는 API 실패다.
  // 실패해도 이 탭만 비고 시트와 편집기는 그대로 산다.
  const [nearby, setNearby] = useState<Row[] | "failed" | null>(null);
  const nearbyKeyRef = useRef<string | null>(null);

  /** 이 시트를 연 동안 담은 관광 데이터. Place 와 달리 서버가 중복을 못 막는다 */
  const [addedExternal, setAddedExternal] = useState<string[]>([]);

  const searchSeqRef = useRef(0);
  const anchorKey = anchor ? `${anchor.lat},${anchor.lng}` : null;
  const full = remainingSlots <= 0;

  // ── 로딩 ───────────────────────────────────────────────────────────────────

  // 인기 장소는 검색어가 없을 때의 기본 목록이다. 빈 검색창만 있는 탭은 막다른 화면이라
  // 뭘 검색해야 할지 모르는 사람이 그대로 멈춘다 (StickerPanel 도 같은 자리에 같은 목록을 쓴다).
  useEffect(() => {
    if (!open || popular !== null) return;
    let alive = true;
    getPopularPlaces().then((rows) => {
      if (alive) setPopular(rows.map(placeToRow));
    });
    return () => {
      alive = false;
    };
  }, [open, popular]);

  useEffect(() => {
    if (!open || tab !== "saved" || saved !== null) return;
    let alive = true;
    getSavedCoursePlaces().then((rows) => {
      if (alive) setSaved(rows.map(savedToRow));
    });
    return () => {
      alive = false;
    };
  }, [open, tab, saved]);

  useEffect(() => {
    if (!open || tab !== "nearby" || !anchor || !anchorKey) return;
    if (nearbyKeyRef.current === anchorKey) return; // 같은 기준점이면 다시 부르지 않는다
    nearbyKeyRef.current = anchorKey;

    let alive = true;
    getNearbyCourseAttractions({ lat: anchor.lat, lng: anchor.lng }).then((items) => {
      if (!alive) return;
      if (items === null) {
        setNearby("failed");
        return;
      }
      setNearby(
        items.map((item) => ({
          key: item.contentId,
          placeId: null,
          nameEn: item.title,
          address: item.address,
          latitude: item.lat,
          longitude: item.lng,
          imageUrl: item.imageUrl,
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [open, tab, anchor, anchorKey]);

  // 검색 디바운스. 검색어가 비면 아무것도 부르지 않고 인기 장소를 그대로 보여준다.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;

    const timer = setTimeout(() => {
      const seq = ++searchSeqRef.current;
      setSearching(true);
      searchPlaces(q).then((rows) => {
        // 늦게 도착한 이전 요청이 최신 결과를 덮어쓰지 않게 한다
        if (seq !== searchSeqRef.current) return;
        setResults(rows.map(placeToRow));
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // ── 선택 ───────────────────────────────────────────────────────────────────

  function handlePick(row: Row) {
    if (full) return;
    if (row.placeId === null) setAddedExternal((prev) => [...prev, row.key]);
    const { key: _key, ...picked } = row;
    void _key;
    onPick(picked);
  }

  function isAdded(row: Row) {
    return row.placeId === null
      ? addedExternal.includes(row.key)
      : existingPlaceIds.includes(row.placeId);
  }

  function renderRows(rows: Row[]) {
    return (
      <div className="space-y-0.5">
        {rows.map((row) => (
          <PlaceRow
            key={row.key}
            row={row}
            added={isAdded(row)}
            disabled={full}
            onPick={handlePick}
          />
        ))}
      </div>
    );
  }

  // ── 탭 내용 ────────────────────────────────────────────────────────────────

  function renderSearchTab() {
    if (query.trim()) {
      if (searching) return <Loading />;
      if (results.length === 0) {
        return (
          <Message
            title="No places found"
            body="Try a different spelling, or look under Nearby Attractions."
          />
        );
      }
      return renderRows(results);
    }

    if (popular === null) return <Loading />;
    if (popular.length === 0) {
      return <Message title="Nothing to show yet" body="Search for a place by name." />;
    }
    return (
      <>
        <p
          className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: SUB }}
        >
          Popular on reCree
        </p>
        {renderRows(popular)}
      </>
    );
  }

  function renderSavedTab() {
    if (saved === null) return <Loading />;
    if (saved.length === 0) {
      return (
        <Message
          title="No saved places yet"
          body="Places you save from posts show up here."
        />
      );
    }
    return renderRows(saved);
  }

  function renderNearbyTab() {
    if (!anchor) {
      return (
        <Message
          title="Add a place first"
          body="Once your journey has a stop, we can look around it for more to see."
        />
      );
    }
    if (nearby === null) return <Loading />;
    if (nearby === "failed") {
      return (
        <Message
          title="Couldn't load attractions"
          body="The tourism service isn't responding. The other tabs still work."
        />
      );
    }
    if (nearby.length === 0) {
      return <Message title="Nothing within 5 km" body={`Searched around ${anchor.label}.`} />;
    }
    return (
      <>
        <p
          className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: SUB }}
        >
          Around {anchor.label}
        </p>
        {renderRows(nearby)}
      </>
    );
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────────

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setAddedExternal([]);
        }
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex max-h-[88vh] flex-col gap-0 rounded-t-2xl p-0"
      >
        <div className="flex flex-none justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-none items-center gap-2 px-3 pb-1">
          <SheetTitle className="min-w-0 flex-1 pl-2 text-[15px] font-bold" style={{ color: INK }}>
            Add to Day {dayNumber}
          </SheetTitle>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex size-11 flex-none items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <X className="size-4" style={{ color: INK }} strokeWidth={2.4} />
          </button>
        </div>

        {/* 탭 — 가로 스크롤. 390px 에서 세 개가 한 줄에 다 들어가지 않는다 */}
        <div className="flex flex-none gap-1.5 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className="h-11 flex-none rounded-full px-4 text-[12.5px] font-semibold transition-colors"
              style={{
                background: tab === t.id ? INK : CHIP_BG,
                color: tab === t.id ? "#FFFFFF" : SUB,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div className="flex-none px-4 pb-3">
            <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: PAPER }}>
              <Search className="size-4 flex-none" style={{ color: SUB }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search places..."
                aria-label="Search places"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                style={{ color: INK }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="flex-none"
                >
                  <X className="size-3.5" style={{ color: SUB }} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-[220px] flex-1 overflow-y-auto px-2 pb-2">
          {tab === "search" && renderSearchTab()}
          {tab === "saved" && renderSavedTab()}
          {tab === "nearby" && renderNearbyTab()}
        </div>

        {/* 한 Day 가 가득 찼으면 왜 더 못 담는지 여기서 말한다 */}
        {full && (
          <p
            className="flex-none px-4 pb-1 pt-2 text-center text-[11px] font-medium leading-none"
            style={{ color: MUTED }}
          >
            This day is full. Remove a place to add another.
          </p>
        )}

        {/* 출처 표기 — 관광 데이터를 보여주는 탭에서만. 텍스트만 쓴다 */}
        {tab === "nearby" && (
          <p
            className="flex-none px-4 pb-1 pt-2 text-center text-[10.5px] font-medium leading-none"
            style={{ color: SUB }}
          >
            {TOUR_API_ATTRIBUTION}
          </p>
        )}

        <div
          className="flex-none"
          style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 14px)", borderTop: `1px solid ${LINE}` }}
        />
      </SheetContent>
    </Sheet>
  );
}
