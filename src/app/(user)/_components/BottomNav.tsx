"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CameraIcon, HomeIcon, MapIcon, ShopIcon, UserIcon, type IconProps } from "@/components/icons";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  BOTTOM_NAV_AVATAR,
  BOTTOM_NAV_ICON,
  BOTTOM_NAV_ICON_ERODE,
  BOTTOM_NAV_ICON_FILTER,
  BOTTOM_NAV_ITEM,
  BOTTOM_NAV_ITEM_GAP,
  BOTTOM_NAV_PAD,
} from "@/lib/bottom-nav";

/**
 * 좌우로 갈라진 플로팅 알약 두 개. 가운데를 비워 콘텐츠가 보이고, 그 자리로 탭도 통과한다.
 *
 * 두 알약은 같은 부품으로 만든다 — 같은 높이(58) · 같은 칸(48) · 같은 활성 표시.
 * 화면에 따라 접거나 펴지 않는다. 폭이 오락가락하면 같은 물체로 안 읽히고,
 * 지도에서도 홈으로 가는 길이 있어야 한다.
 *
 * 라벨은 없다. 10px 은 읽기에 너무 작아서 있으나 마나였다 —
 * 이름은 aria-label 로만 남기고 화면에는 아이콘과 활성 원만 둔다.
 *
 * 경로 이름과 화면 내용이 어긋나 있다 — /feed 가 홈이고 /discover 가 지도다.
 * revalidatePath("/discover") 가 25곳이라 경로는 그대로 두고 아이콘만 내용에 맞춘다.
 */
type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
};

const LEFT_TABS: readonly Tab[] = [
  { href: "/profile", label: "profile", Icon: UserIcon },
  { href: "/shop", label: "shop", Icon: ShopIcon },
  { href: "/recreeshot", label: "recreeshot", Icon: CameraIcon },
];

const RIGHT_TABS: readonly Tab[] = [
  { href: "/feed", label: "home", Icon: HomeIcon },
  { href: "/discover", label: "map", Icon: MapIcon },
];

/** 두 알약이 공유하는 표면. 유리 느낌은 여기 흰색 93% 와 blur 가 만든다 */
const SURFACE: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.93)",
  border: "1px solid rgba(255, 255, 255, 0.17)",
  // 시안은 y오프셋 48 인데, 화면 바닥에서 20px 위에 뜬 요소라 그림자가 화면 밖으로 나간다.
  // 색과 번짐은 그대로 두고 거리만 줄여 같은 인상만 가져온다.
  boxShadow: "0 12px 32px rgba(17, 12, 46, 0.15)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const MUTED = "var(--palette-gray-800)";
const ACTIVE = "var(--palette-black)";

/** 칸 하나. 48 정사각이라 활성 표시가 정확히 원이 된다 */
function NavItem({
  tab,
  active,
  avatarUrl,
}: {
  tab: Tab;
  active: boolean;
  /** 넘기면 아이콘 대신 아바타. null 도 유효한 값이라 undefined 로만 구분한다 */
  avatarUrl?: string | null;
}) {
  const { Icon, label, href } = tab;

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative flex flex-none items-center justify-center rounded-full transition-transform active:scale-95 lg:focus-visible:outline-none lg:focus-visible:ring-2 lg:focus-visible:ring-foreground"
      style={{ width: BOTTOM_NAV_ITEM, height: BOTTOM_NAV_ITEM }}
    >
      {/* lg 상단 바에서만 쓰는 이름표(칸 아래). 모바일은 라벨을 없앤 이유(10px)가 그대로라 띄우지 않는다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-md lg:group-hover:block lg:group-focus-visible:block"
      >
        {label}
      </span>

      {/* 라임 원을 배경이 아니라 별도 요소로 둔다. 활성이 될 때만 마운트되므로
          애니메이션이 "그때 한 번" 재생된다 — 배경색이면 다시 재생할 방법이 없다. */}
      {active && (
        <span
          aria-hidden
          className="nav-pop absolute inset-0 rounded-full"
          style={{ background: "var(--brand)" }}
        />
      )}

      {avatarUrl !== undefined ? (
        <span className="relative flex">
          <UserAvatar imageUrl={avatarUrl} size={BOTTOM_NAV_AVATAR} />
        </span>
      ) : (
        <Icon
          size={BOTTOM_NAV_ICON}
          className="relative transition-colors duration-200"
          style={{ color: active ? ACTIVE : MUTED, filter: `url(#${BOTTOM_NAV_ICON_FILTER})` }}
        />
      )}
    </Link>
  );
}

/**
 * 알약 하나. 여백 4 + 테두리 1 이라 48 짜리 칸이 들어가면 높이가 58 이 된다.
 *
 * 여백과 간격은 Tailwind 유틸리티(p-1 · gap-0.5) 대신 상수를 인라인으로 쓴다.
 * 임의값 클래스로는 연결할 수 없다 — 템플릿 문자열로 조립한 클래스 이름은
 * Tailwind 가 스캔하지 못해 유틸리티가 아예 생성되지 않는다.
 * 리터럴로 두면 상수를 고쳐도 화면이 안 바뀌는 이중 관리가 된다.
 */
function Pill({ children, barClassName }: { children: React.ReactNode; barClassName: string }) {
  return (
    // lg 는 바 자체가 표면이라 알약의 흰 바탕 · 테두리 · 그림자를 지운다. 인라인 style 이라 ! 로 덮는다
    <div
      className={`pointer-events-auto flex items-center rounded-full lg:border-transparent! lg:bg-transparent! lg:shadow-none! ${barClassName}`}
      style={{ ...SURFACE, gap: BOTTOM_NAV_ITEM_GAP, padding: BOTTOM_NAV_PAD }}
    >
      {children}
    </div>
  );
}

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
  /** 모바일에서만 숨긴다 (lg 상단 바는 그대로) — isBottomNavHiddenOnMobile */
  hiddenOnMobile?: boolean;
}

export function BottomNav({ isLoggedIn, profileImageUrl, hiddenOnMobile = false }: Props) {
  const pathname = usePathname();

  // startsWith(href) 만 쓰면 /feed 가 /feedback 까지 잡는다
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const render = (tab: Tab) => (
    <NavItem
      key={tab.href}
      tab={tab}
      active={isActive(tab.href)}
      avatarUrl={tab.href === "/profile" && isLoggedIn ? profileImageUrl : undefined}
    />
  );

  return (
    // pointer-events-none 이 가운데 빈 공간을 통과시킨다. 알약만 auto 로 되살린다.
    // nav-tuckable 은 지도 시트가 끝까지 올라왔을 때의 퇴장을 맡는다 (globals.css).
    //
    // lg 에서는 화면 위 가로 바가 된다 (docs/design/desktop-layout.md §15 원칙 1). 높이는 --top-nav-space,
    // 로고 · 홈 · 지도 왼쪽, recreeshot · shop · profile 오른쪽. 표면은 .app-header 와 같다.
    // bottom 을 인라인 style 에서 클래스로 옮긴 건 lg: 로 덮기 위해서다 — 값은 같다.
    <div
      data-main-nav
      className={`${hiddenOnMobile ? "max-lg:hidden " : ""}nav-tuckable pointer-events-none fixed inset-x-0 bottom-[var(--bottom-nav-bottom)] z-40 lg:pointer-events-auto lg:top-0 lg:bottom-auto lg:h-[var(--top-nav-space)] lg:bg-background/95 lg:shadow-[0_1px_4px_rgba(0,0,0,0.07)] lg:backdrop-blur-sm`}
    >
      {/* 아이콘 획을 깎는 필터. 아바타에는 걸지 않는다 — 사진은 깎을 획이 없다.
          한 번만 정의하고 다섯 아이콘이 id 로 참조한다. */}
      <svg aria-hidden className="absolute size-0" focusable="false">
        <filter id={BOTTOM_NAV_ICON_FILTER} x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology operator="erode" radius={BOTTOM_NAV_ICON_ERODE} />
        </filter>
      </svg>

      <nav
        aria-label="Main"
        className="nav-rise mx-auto flex max-w-[var(--app-col-w)] items-center justify-between px-5 lg:h-full lg:justify-start lg:gap-6 lg:px-10"
      >
        {/* DOM 순서(모바일 왼→오)는 그대로 두고 lg 는 order 로 다시 놓는다 — 로고 · 홈/지도 | … | recreeshot · shop · profile */}
        <Pill barClassName="lg:order-3 lg:ml-auto lg:flex-row-reverse">{LEFT_TABS.map(render)}</Pill>
        <Pill barClassName="lg:order-2">{RIGHT_TABS.map(render)}</Pill>
        <Link href="/feed" className="hidden text-xl font-bold tracking-tight lg:order-1 lg:block">
          reCree
        </Link>
      </nav>
    </div>
  );
}
