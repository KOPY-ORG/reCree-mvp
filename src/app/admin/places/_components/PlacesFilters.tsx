"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_LABELS: Record<string, string> = {
  KR: "한국",
  JP: "일본",
  US: "미국",
  CN: "중국",
  TW: "대만",
  TH: "태국",
  VN: "베트남",
  HK: "홍콩",
  SG: "싱가포르",
};

interface Props {
  countries: string[];
  cities: string[];
  currentSearch: string;
  currentCountry: string;
  currentCity: string;
  currentStatus: string;
  currentSource: string;
  currentVerified: string;
}

function buildUrl(
  pathname: string,
  values: {
    search: string;
    country: string;
    city: string;
    status: string;
    source: string;
    verified: string;
  },
): string {
  const sp = new URLSearchParams();
  if (values.search) sp.set("search", values.search);
  if (values.country) sp.set("country", values.country);
  if (values.city) sp.set("city", values.city);
  if (values.status) sp.set("status", values.status);
  if (values.source) sp.set("source", values.source);
  if (values.verified) sp.set("verified", values.verified);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function PlacesFilters({
  countries,
  cities,
  currentSearch,
  currentCountry,
  currentCity,
  currentStatus,
  currentSource,
  currentVerified,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(currentSearch);

  // 디바운스: 검색어 300ms 후 URL 업데이트
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => {
      router.push(
        buildUrl(pathname, {
          search: searchValue,
          country: currentCountry,
          city: currentCity,
          status: currentStatus,
          source: currentSource,
          verified: currentVerified,
        }),
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const current = {
    search: searchValue,
    country: currentCountry,
    city: currentCity,
    status: currentStatus,
    source: currentSource,
    verified: currentVerified,
  };

  const handleCountryChange = (value: string) => {
    const country = value === "all" ? "" : value;
    router.push(buildUrl(pathname, { ...current, country, city: "" }));
  };

  const handleChange = (key: keyof typeof current, value: string) => {
    const actual = value === "all" ? "" : value;
    router.push(buildUrl(pathname, { ...current, [key]: actual }));
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="장소명으로 검색..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 나라 */}
      <Select value={currentCountry || "all"} onValueChange={handleCountryChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 나라</SelectItem>
          {countries.map((c) => (
            <SelectItem key={c} value={c}>
              {COUNTRY_LABELS[c] ? `${COUNTRY_LABELS[c]} (${c})` : c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 도시 */}
      <Select
        value={currentCity || "all"}
        onValueChange={(v) => handleChange("city", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 도시</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 상태 */}
      <Select
        value={currentStatus || "all"}
        onValueChange={(v) => handleChange("status", v)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="OPEN">영업중</SelectItem>
          <SelectItem value="CLOSED_TEMP">임시휴업</SelectItem>
          <SelectItem value="CLOSED_PERMANENT">폐업</SelectItem>
        </SelectContent>
      </Select>

      {/* 출처 */}
      <Select
        value={currentSource || "all"}
        onValueChange={(v) => handleChange("source", v)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 출처</SelectItem>
          <SelectItem value="ADMIN">ADMIN</SelectItem>
          <SelectItem value="USER">USER</SelectItem>
        </SelectContent>
      </Select>

      {/* 인증 */}
      <Select
        value={currentVerified || "all"}
        onValueChange={(v) => handleChange("verified", v)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 인증</SelectItem>
          <SelectItem value="true">인증됨</SelectItem>
          <SelectItem value="false">미인증</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
