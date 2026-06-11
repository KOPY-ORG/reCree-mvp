"use client";

import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { ScrapButton } from "../../_components/ScrapButton";
import { PostBadges } from "../../_components/PostCard";
import { EventListCard } from "@/components/maps/EventListCard";
import { type TagGroupColorMap } from "@/lib/post-labels";
import type { PostItem } from "@/lib/post-queries";
import type { EventCollectionMapMarker } from "@/lib/event-collection-queries";

type TagGroupConfig = {
  group: string;
  displayLabel: string | null;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

type ReCreeshot = {
  id: string;
  imageUrl: string;
  referencePhotoUrl: string | null;
  templateId?: string | null;
  status: string;
};

type SavedEventCardData = {
  marker: EventCollectionMapMarker;
  collectionName: string;
  collectionSlug: string;
  placeCount: number;
};

interface Props {
  posts: PostItem[];
  recreeshots: ReCreeshot[];
  tagGroupConfigs: TagGroupConfig[];
  savedEvents: SavedEventCardData[];
}

function SavedPostCard({ post, tagGroupMap }: { post: PostItem; tagGroupMap: TagGroupColorMap }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
    >
      <div className="relative size-[88px] shrink-0 rounded-lg overflow-hidden bg-muted">
        {post.postImages[0]?.url ? (
          <Image
            src={post.postImages[0].url}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(post.postImages[0].url)}
            className="object-cover"
            style={focalStyle(post.postImages[0].focalX, post.postImages[0].focalY, post.postImages[0].zoom)}
            sizes="88px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base line-clamp-2 leading-snug">
          {post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo ?? post.titleEn}
        </p>
        {post.postPlaces[0] && (
          <p className="text-[10px] font-normal text-muted-foreground line-clamp-2 leading-snug mt-0.5">
            {post.titleEn}
          </p>
        )}
        <div className="mt-1.5">
          <PostBadges post={post} tagGroupMap={tagGroupMap} variant="list" />
        </div>
      </div>

      <ScrapButton postId={post.id} initialSaved={true} size="md" />
    </Link>
  );
}

const TABS = ["events", "posts", "recreeshots"] as const;
type SavedTab = (typeof TABS)[number];

function tabHref(t: SavedTab): string {
  if (t === "events") return "/saved";
  return `/saved?tab=${t}`;
}

export function SavedClient({ posts, recreeshots, tagGroupConfigs, savedEvents }: Props) {
  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: SavedTab = rawTab === "posts" ? "posts" : rawTab === "recreeshots" ? "recreeshots" : "events";
  const router = useRouter();

  return (
    <div>
      {/* 탭 바 */}
      <div className="flex border-b border-secondary sticky top-0 bg-background z-10 max-w-2xl mx-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => router.push(tabHref(t))}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              tab === t ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 이벤트 탭 */}
      {tab === "events" && (
        <div className="px-4 max-w-2xl mx-auto pt-3 pb-4 space-y-2">
          {savedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center">
              <p className="text-base font-semibold">No saved events yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the bookmark icon on any event to save it here.
              </p>
              <Link
                href="/discover"
                className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold"
              >
                Explore events
              </Link>
            </div>
          ) : (
            savedEvents.map((item) => (
              <EventListCard
                key={item.marker.eventId}
                event={item.marker}
                collectionName={item.collectionName}
                collectionSlug={item.collectionSlug}
                placeCount={item.placeCount}
                isSaved={true}
                onSelect={() => router.push(`/events/${item.collectionSlug}/${item.marker.eventSlug}`)}
              />
            ))
          )}
        </div>
      )}

      {/* 포스트 탭 */}
      {tab === "posts" && (
        <div className="px-4 max-w-2xl mx-auto">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center">
              <p className="text-base font-semibold">No saved posts yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the bookmark icon on any post to save it here.
              </p>
              <Link
                href="/discover?tab=posts"
                className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold"
              >
                Explore posts
              </Link>
            </div>
          ) : (
            posts.map((post) => (
              <SavedPostCard key={post.id} post={post} tagGroupMap={tagGroupMap} />
            ))
          )}
        </div>
      )}

      {/* 리크리샷 탭 */}
      {tab === "recreeshots" && (
        <div>
          {recreeshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-3 text-center px-4">
              <p className="text-base font-semibold">No saved recreeshots yet</p>
              <p className="text-sm text-muted-foreground">
                Save recreeshots from the explore page to see them here.
              </p>
            </div>
          ) : (
            <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {recreeshots.map((shot) => (
                <Link
                  key={shot.id}
                  href={`/recreeshot/${shot.id}?from=saved&savedTab=recreeshots`}
                  className="block"
                >
                  <ReCreeshotImage
                    shotUrl={shot.imageUrl}
                    variant="thumb-md"
                    className="w-full aspect-[4/5] shadow-md"
                    sizes="50vw"
                  />
                </Link>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
