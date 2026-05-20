import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { isExternalImage } from "@/lib/image";
import Link from "next/link";
import { ChevronRight, MapPin, EyeOff, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveTopicColors, resolveTagColors, type TagGroupColorMap } from "@/lib/post-labels";
import { HallDetailClient } from "./_components/HallDetailClient";
import { HallDetailTopSection } from "./_components/HallDetailTopSection";
import { HallDetailOwnerDeleteButton } from "./_components/HallDetailOwnerDeleteButton";
import { HallDetailBackButton } from "./_components/HallDetailBackButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shot = await prisma.reCreeshot.findUnique({
    where: { id },
    select: {
      locationName: true,
      story: true,
      tips: true,
      imageUrl: true,
      linkedPostId: true,
    },
  });

  if (!shot) return {};

  const linkedPost = shot.linkedPostId
    ? await prisma.post.findUnique({
        where: { id: shot.linkedPostId },
        select: { titleEn: true },
      })
    : null;

  // "recreeshot at Bukhangang Bridge — ATEEZ Aurora MV Filming Location"
  const title = [
    shot.locationName ? `recreeshot at ${shot.locationName}` : "recreeshot",
    linkedPost?.titleEn,
  ].filter(Boolean).join(" — ");

  const rawDescription = [shot.story, shot.tips].filter(Boolean).join(" | ");
  const description = rawDescription
    ? rawDescription.slice(0, 160)
    : shot.locationName
      ? `Check out this recreeshot taken at ${shot.locationName} on reCree.`
      : "Check out this recreeshot on reCree.";
  const imageUrl = shot.imageUrl ?? "https://recree.io/og-default.png";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | reCree`,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | reCree`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function HallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const shot = await prisma.reCreeshot.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, nickname: true, profileImageUrl: true } },
      reCreeshotTopics: {
        include: {
          topic: {
            select: {
              id: true, nameEn: true,
              colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
              parent: {
                select: {
                  colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                  parent: {
                    select: {
                      colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                      parent: { select: { colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      reCreeshotTags: {
        include: {
          tag: { select: { id: true, name: true, group: true, colorHex: true, colorHex2: true, textColorHex: true } },
        },
      },
    },
  });

  if (!shot) notFound();

  const isOwner = currentUser?.id === shot.user.id;

  if (shot.status === "DELETED") {
    return (
      <div className="max-w-2xl mx-auto min-h-dvh flex flex-col">
        <div className="flex items-center h-12 px-2 bg-white border-b border-gray-100 shrink-0">
          <HallDetailBackButton />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <Trash2 className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-base">This recreeshot is no longer available.</p>
            <p className="text-sm text-muted-foreground">It may have been deleted by the creator.</p>
          </div>
        </div>
      </div>
    );
  }

  // 숨김 처리된 리크리샷 안내 페이지 (직접 숨김 또는 신고로 인한 숨김)
  if (shot.status === "HIDDEN" || shot.status === "REPORT_HIDDEN") {
    return (
      <div className="max-w-2xl mx-auto min-h-dvh flex flex-col">
        <div className="flex items-center h-12 px-2 bg-white border-b border-gray-100 shrink-0">
          <HallDetailBackButton />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <EyeOff className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-base">This content is not available.</p>
            <p className="text-sm text-muted-foreground">
              {shot.status === "REPORT_HIDDEN"
                ? "This recreeshot has been removed after a review."
                : "This recreeshot has been hidden by an administrator."}
            </p>
          </div>
          {isOwner && <HallDetailOwnerDeleteButton id={id} />}
        </div>
      </div>
    );
  }

  // 태그 그룹 컬러 맵
  const tagGroups = await prisma.tagGroupConfig.findMany({
    select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
  });
  const groupMap: TagGroupColorMap = new Map(tagGroups.map((g) => [g.group, g]));

  const liked = currentUser
    ? !!(await prisma.reCreeshotLike.findUnique({
        where: { userId_reCreeshotId: { userId: currentUser.id, reCreeshotId: id } },
      }))
    : false;

  const saved = currentUser
    ? !!(await prisma.save.findUnique({
        where: { userId_targetType_targetId: { userId: currentUser.id, targetType: "RECREESHOT", targetId: id } },
      }))
    : false;

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* 흰색 헤더 + 합성 이미지 (꾹 눌러 Photos 저장) */}
      <HallDetailTopSection
        id={id}
        isOwner={isOwner}
        isLoggedIn={!!currentUser}
        imageUrl={shot.imageUrl}
        referencePhotoUrl={shot.referencePhotoUrl}
        matchScore={shot.matchScore}
        showBadge={shot.showBadge}
      />

      {/* 콘텐츠 */}
      <div className="px-4 py-4 space-y-4">
        {/* 사용자 정보 + 날짜 + 액션 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-brand overflow-hidden flex items-center justify-center shrink-0">
              {shot.user.profileImageUrl ? (
                <Image
                  src={shot.user.profileImageUrl}
                  alt={shot.user.nickname ?? "user"}
                  width={32}
                  height={32}
                  unoptimized={isExternalImage(shot.user.profileImageUrl)}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-xs font-bold text-black">
                  {shot.user.email[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{shot.user.nickname ?? "Anonymous"}</p>
              <p className="text-xs text-muted-foreground/60 leading-tight mt-0.5">
                {shot.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <HallDetailClient
            reCreeshotId={id}
            initialLiked={liked}
            initialSaved={saved}
            likeCount={shot.likeCount}
          />
        </div>

        {/* 장소명 */}
        {shot.locationName && (
          shot.placeId ? (
            <Link
              href={`/discover?view=map&place=${shot.placeId}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground w-fit"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span>{shot.locationName}</span>
              <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            </Link>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {shot.locationName}
            </p>
          )
        )}

        {/* 토픽/태그 배지 */}
        {(shot.reCreeshotTopics.length > 0 || shot.reCreeshotTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {shot.reCreeshotTopics.map(({ topic }) => {
              const c = resolveTopicColors(topic);
              const bg = c.colorHex2
                ? `linear-gradient(${c.gradientDir}, ${c.colorHex}, ${c.colorHex2} ${c.gradientStop}%)`
                : c.colorHex;
              return (
                <span
                  key={topic.id}
                  className="pill-badge text-xs font-medium"
                  style={{ background: bg, color: c.textColorHex }}
                >
                  {topic.nameEn}
                </span>
              );
            })}
            {shot.reCreeshotTags.map(({ tag }) => {
              const c = resolveTagColors(tag, groupMap.get(tag.group));
              const bg = c.colorHex2
                ? `linear-gradient(${c.gradientDir}, ${c.colorHex}, ${c.colorHex2} ${c.gradientStop}%)`
                : c.colorHex;
              return (
                <span
                  key={tag.id}
                  className="pill-badge text-xs font-medium"
                  style={{ background: bg, color: c.textColorHex }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}

        {/* 스토리 */}
        {shot.story && (
          <div className="rounded-xl px-4 py-3 space-y-1 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Story</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed break-words">{shot.story}</p>
          </div>
        )}

        {/* 팁 — 뉴트럴 카드 */}
        {shot.tips && (
          <div className="rounded-xl px-4 py-3 space-y-1 bg-brand-sub3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tips</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed break-words">{shot.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
}
