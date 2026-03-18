import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { UsersTable } from "./_components/UsersTable";
import { UsersSearch } from "./_components/UsersSearch";
import { PlacesPagination } from "../places/_components/PlacesPagination";

const PAGE_SIZE = 30;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { nickname: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        createdAt: true,
        _count: { select: { reCreeshots: true, saves: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  const filterQuery = filterParams.toString();

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            가입 사용자 조회 및 관리
          </p>
        </div>
      </div>

      {/* 검색 */}
      <UsersSearch currentSearch={search} />

      {/* 테이블 */}
      <UsersTable users={users} />

      {/* 페이지네이션 */}
      <PlacesPagination
        totalCount={total}
        currentPage={page}
        pageSize={PAGE_SIZE}
        filterQuery={filterQuery}
        label="사용자"
      />
    </div>
  );
}
