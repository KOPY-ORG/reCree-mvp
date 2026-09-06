"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, House, Map, ShoppingBag, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

/**
 * 좌우로 갈라진 플로팅 알약 두 개 (시안 :1067-1090).
 * 가운데를 비워 콘텐츠가 보이고, 그 자리로 탭도 그대로 통과한다.
 *
 * 경로 이름과 화면 내용이 어긋나 있다 — /feed 가 홈이고 /discover 가 지도다.
 * revalidatePath("/discover") 가 25곳이라 경로는 그대로 두고 아이콘만 내용에 맞춘다.
 */
const LEFT_TABS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/recreeshot", label: "recreeshot", icon: Camera },
] as const;

const RIGHT_TABS = [
  { href: "/feed", label: "Home", icon: House },
  { href: "/discover", label: "Map", icon: Map },
] as const;

/**
 * 비활성 아이콘도 진하게 둔다. 상태는 색 대비가 아니라 라임 원이 말하므로,
 * 대비를 낮추면 읽기만 어려워지고 얻는 게 없다 (시안도 같은 판단이다).
 */
const ICON_CLASS = "size-[22px]";

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}

/** 알약 하나. 안쪽 여백 6px, 버튼 사이 4px */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-background/90 p-1.5 shadow-[0_8px_26px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.04] backdrop-blur-xl">
      {children}
    </div>
  );
}

export function BottomNav({ isLoggedIn, profileImageUrl }: Props) {
  const pathname = usePathname();

  // startsWith(href) 만 쓰면 /feed 가 /feedback 까지 잡는다
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function renderTab({ href, label, icon: Icon }: (typeof LEFT_TABS)[number] | (typeof RIGHT_TABS)[number]) {
    const active = isActive(href);
    // 로그인 상태의 Profile 만 아바타를 유지한다. 라임 원을 깔면 아바타를 덮으므로
    // 같은 라임을 링으로 두른다 — 표시 언어는 같고 얼굴은 그대로 보인다.
    const showAvatar = href === "/profile" && isLoggedIn;

    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className="flex size-12 flex-none items-center justify-center rounded-full transition-transform active:scale-95"
        style={active && !showAvatar ? { background: "var(--brand)" } : undefined}
      >
        {showAvatar ? (
          // 링은 ring-* 유틸리티 대신 box-shadow 로 직접 그린다. Tailwind 링 변수를 타면
          // 여기서 투명하게 계산되는데, 링은 Profile 활성 표시의 전부라 사라지면 안 된다.
          <span
            className="flex rounded-full"
            style={active ? { boxShadow: "0 0 0 3px var(--brand)" } : undefined}
          >
            <UserAvatar imageUrl={profileImageUrl} size={28} />
          </span>
        ) : (
          <Icon
            className={ICON_CLASS}
            style={{ color: active ? "var(--brand-foreground)" : "var(--palette-gray-900)" }}
            strokeWidth={1.9}
          />
        )}
      </Link>
    );
  }

  return (
    // pointer-events-none 이 가운데 빈 공간을 통과시킨다. 알약만 auto 로 되살린다.
    <div
      className="pointer-events-none fixed inset-x-0 z-40"
      style={{ bottom: "var(--bottom-nav-bottom)" }}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[540px] items-center justify-between px-4"
      >
        <Pill>{LEFT_TABS.map(renderTab)}</Pill>
        <Pill>{RIGHT_TABS.map(renderTab)}</Pill>
      </nav>
    </div>
  );
}
