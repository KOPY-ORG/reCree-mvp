import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma, PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PostsFilters } from "./_components/PostsFilters";
import { PostsTable } from "./_components/PostsTable";
import { PlacesPagination } from "../places/_components/PlacesPagination";

const PAGE_SIZE = 20;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";
  const status = params.status ?? "";

  const where: Prisma.PostWhereInput = {
    ...(search && {
      OR: [
        { titleKo: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status && { status: status as PostStatus }),
  };

  const [posts, totalCount] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        titleKo: true,
        titleEn: true,
        slug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        postTopics: {
          select: {
            topic: { select: { id: true, nameKo: true } },
          },
        },
        postTags: {
          select: {
            tag: { select: { id: true, nameKo: true, colorHex: true } },
          },
        },
        postPlaces: {
          select: {
            place: { select: { id: true, nameKo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
  ]);

  const isFiltered = !!(search || status);

  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (status) filterParams.set("status", status);
  const filterQuery = filterParams.toString();

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">포스트 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            K-콘텐츠 포스트 관리
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new">
            <Plus className="h-4 w-4 mr-1.5" />
            새 포스트
          </Link>
        </Button>
      </div>

      <PostsFilters currentSearch={search} currentStatus={status} />

      <PostsTable posts={posts} isFiltered={isFiltered} />
      <PlacesPagination
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        filterQuery={filterQuery}
      />
    </div>
  );
}
