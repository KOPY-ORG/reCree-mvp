import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma, PlaceStatus, PlaceSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PlacesFilters } from "./_components/PlacesFilters";
import { PlacesTable } from "./_components/PlacesTable";
import { PlacesPagination } from "./_components/PlacesPagination";

const PAGE_SIZE = 20;

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    country?: string;
    city?: string;
    status?: string;
    source?: string;
    verified?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";
  const country = params.country ?? "";
  const city = params.city ?? "";
  const status = params.status ?? "";
  const source = params.source ?? "";
  const verified = params.verified ?? "";

  const where: Prisma.PlaceWhereInput = {
    ...(search && {
      OR: [
        { nameKo: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(country && { country }),
    ...(city && { city }),
    ...(status && { status: status as PlaceStatus }),
    ...(source && { source: source as PlaceSource }),
    ...(verified === "true" && { isVerified: true }),
    ...(verified === "false" && { isVerified: false }),
  };

  const [places, totalCount, countryGroups, cityGroups] = await Promise.all([
    prisma.place.findMany({
      where,
      select: {
        id: true,
        nameKo: true,
        nameEn: true,
        country: true,
        city: true,
        status: true,
        source: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: { postPlaces: true, reCreeshots: true },
        },
        postPlaces: {
          select: { post: { select: { saveCount: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.place.count({ where }),
    // 전체 나라 목록 (필터 무관)
    prisma.place.groupBy({
      by: ["country"],
      orderBy: { country: "asc" },
    }),
    // 선택된 나라의 도시 목록
    prisma.place.groupBy({
      by: ["city"],
      where: {
        city: { not: null },
        ...(country && { country }),
      },
      orderBy: { city: "asc" },
    }),
  ]);

  const countries = countryGroups.map((g) => g.country);
  const cities = cityGroups
    .map((g) => g.city)
    .filter((c): c is string => c !== null);

  // postPlaces 제거하고 saveCount 계산
  const processedPlaces = places.map(({ postPlaces, ...rest }) => ({
    ...rest,
    saveCount: postPlaces.reduce((sum, pp) => sum + pp.post.saveCount, 0),
  }));

  const isFiltered = !!(search || country || city || status || source || verified);

  // 페이지네이션에 전달할 필터 쿼리 문자열 (page 제외)
  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (country) filterParams.set("country", country);
  if (city) filterParams.set("city", city);
  if (status) filterParams.set("status", status);
  if (source) filterParams.set("source", source);
  if (verified) filterParams.set("verified", verified);
  const filterQuery = filterParams.toString();

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">장소 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            K-콘텐츠 관련 장소 관리
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/admin/places/new">
            <Plus className="h-4 w-4 mr-1.5" />
            새 장소
          </Link>
        </Button>
      </div>

      {/* 필터 바 */}
      <PlacesFilters
        countries={countries}
        cities={cities}
        currentSearch={search}
        currentCountry={country}
        currentCity={city}
        currentStatus={status}
        currentSource={source}
        currentVerified={verified}
      />

      {/* 테이블 (빈 상태도 헤더는 항상 표시) */}
      <PlacesTable places={processedPlaces} isFiltered={isFiltered} />
      <PlacesPagination
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        filterQuery={filterQuery}
      />
    </div>
  );
}
