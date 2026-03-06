import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreviewPostPage({ params }: Props) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      postTopics: { include: { topic: { select: { nameEn: true, nameKo: true, colorHex: true, textColorHex: true } } } },
      postTags: { include: { tag: { select: { nameKo: true, colorHex: true } } } },
      postPlaces: {
        include: {
          place: {
            select: { nameKo: true, nameEn: true, addressKo: true },
          },
        },
      },
    },
  });

  if (!post) notFound();

  const firstPlace = post.postPlaces[0];

  return (
    <div className="min-h-screen bg-background">
      {/* 미리보기 배너 */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900">
        <span>미리보기 모드 — 실제 사용자에게 보이는 화면과 다를 수 있습니다.</span>
        <Link
          href={`/admin/posts/${id}/edit`}
          className="flex items-center gap-1 rounded bg-yellow-900/10 px-3 py-1 text-xs hover:bg-yellow-900/20"
        >
          <ArrowLeft className="h-3 w-3" />
          편집으로 돌아가기
        </Link>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        {/* 썸네일 */}
        {post.thumbnailUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl">
            <Image
              src={post.thumbnailUrl}
              alt={post.titleKo}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* 토픽 */}
        {post.postTopics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.postTopics.map(({ topic }) => (
              <span
                key={topic.nameEn}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: topic.colorHex ?? "#e5e7eb",
                  color: topic.textColorHex ?? "#000",
                }}
              >
                {topic.nameKo}
              </span>
            ))}
          </div>
        )}

        {/* 제목 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold leading-snug">{post.titleKo}</h1>
          {post.titleEn && (
            <p className="text-lg text-muted-foreground">{post.titleEn}</p>
          )}
          {post.subtitleKo && (
            <p className="text-base text-muted-foreground">{post.subtitleKo}</p>
          )}
        </div>

        {/* 태그 */}
        {post.postTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.postTags.map(({ tag }) => (
              <span
                key={tag.nameKo}
                className="rounded-full border px-2 py-0.5 text-xs"
                style={tag.colorHex ? { borderColor: tag.colorHex, color: tag.colorHex } : {}}
              >
                {tag.nameKo}
              </span>
            ))}
          </div>
        )}

        {/* 연결 장소 */}
        {firstPlace && (
          <div className="rounded-xl border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">장소</p>
            <p className="font-medium">{firstPlace.place.nameKo}</p>
            {firstPlace.place.nameEn && (
              <p className="text-sm text-muted-foreground">{firstPlace.place.nameEn}</p>
            )}
            {firstPlace.place.addressKo && (
              <p className="text-xs text-muted-foreground">{firstPlace.place.addressKo}</p>
            )}
            {firstPlace.context && (
              <p className="mt-2 text-sm">{firstPlace.context}</p>
            )}
          </div>
        )}

        {/* 본문 */}
        {post.bodyKo && (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">본문 (한국어)</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.bodyKo}</div>
          </div>
        )}

        {post.bodyEn && (
          <div className="prose prose-sm max-w-none">
            <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Story (English)</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.bodyEn}</div>
          </div>
        )}

        {/* 상태 표시 */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">
            상태: <span className="font-medium">{post.status}</span>
            {post.publishedAt && (
              <> · 발행일: {new Date(post.publishedAt).toLocaleDateString("ko-KR")}</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
