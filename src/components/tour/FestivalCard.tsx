"use client";

// ─── 축제 카드 ────────────────────────────────────────────────────────────────
// RegionTourSections.tsx 안에 있던 것을 그대로 옮긴 것이다 (:39-45, :64-92, :205-240).
// 홈 · discover 지역 섹션 · discover 바텀시트 셋이 같은 카드를 쓰게 되어,
// 카드가 그 파일의 IntersectionObserver·재시도 상태와 같은 모듈에 있을 이유가 없어졌다.
//
// "use client" 는 그대로 둔다. 클라이언트인 것이 문제였던 적이 없다 —
// 관측자·재시도 상태와 엮여 있던 것이 문제였고 그 결합만 끊었다.
// 서버 컴포넌트가 이 카드를 그리는 것은 막히지 않는다.

import Link from "next/link";
import { TEXT_H, CardImage } from "./CardImage";
import type { Festival } from "@/lib/tour-api/types";

// ─── 날짜 · 상태 ──────────────────────────────────────────────────────────────
// 카드가 쓰고, discover 가 상세 시트의 meta 줄을 만들 때 한 번 더 쓴다.
// 그래서 둘은 내보내고, 그 둘만 쓰는 monthDay·MONTHS 는 여기 가둔다.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthDay(yyyymmdd: string): string | null {
  const month = MONTHS[Number(yyyymmdd.slice(4, 6)) - 1];
  if (!month) return null;
  return `${month} ${Number(yyyymmdd.slice(6, 8))}`;
}

/**
 * "20260918" 두 개를 사람이 읽는 한 줄로.
 *
 * 진행중이면 시작일을 버리고 끝나는 날만 쓴다 — "Until Dec 31".
 * 범위로 쓰면 거짓말이 되기 때문이다. searchFestival2 의 진행중 목록은 대부분 상설
 * 프로그램이라 몇 해 전에 시작한 것이 섞인다 (실측: 서울 진행중 12건 중 12건이 연 단위,
 * 그중 "페인터즈"는 2022-11-01 시작). 해를 감춘 "Nov 1 – Dec 31" 은 올해 그 날짜에
 * 시작한 것처럼 읽힌다. 그리고 이미 하고 있는 것에서 알고 싶은 것은 언제까지인가 하나다.
 *
 * 예정이면 범위 그대로.
 *   같은 날   Sep 19
 *   같은 달   Sep 18 – 20
 *   다른 달   Sep 24 – Oct 24
 *
 * 끝나는 해가 올해가 아닐 때만 연도를 붙인다. 30일 안에 시작하는 것만 올라오므로
 * 시작 쪽에 연도가 필요한 경우는 없고, 해를 넘겨 끝나는 것만 "Dec 20 – Jan 5, 2027" 이 된다.
 */
export function formatFestivalPeriod(festival: Festival): string | null {
  const { startDate, endDate, status } = festival;
  if (!/^\d{8}$/.test(startDate) || !/^\d{8}$/.test(endDate)) return null;

  const start = monthDay(startDate);
  const end = monthDay(endDate);
  if (!start || !end) return null;

  const yearSuffix = endDate.slice(0, 4) === String(new Date().getFullYear()) ? "" : `, ${endDate.slice(0, 4)}`;

  if (status === "ongoing") return `Until ${end}${yearSuffix}`;
  if (startDate === endDate) return `${start}${yearSuffix}`;
  if (startDate.slice(0, 6) === endDate.slice(0, 6)) {
    return `${start} – ${Number(endDate.slice(6, 8))}${yearSuffix}`;
  }
  return `${start} – ${end}${yearSuffix}`;
}

/**
 * 뱃지 글자. 날짜만으로는 "지금 갈 수 있는지"를 세어 봐야 알 수 있다 —
 * 그 한 번의 계산을 없애는 것이 status 의 쓸모다.
 *
 * upcoming 은 startDate > 오늘 이 성립할 때만 붙으므로 daysUntilStart 가 1 이상이다.
 */
export function festivalStatusLabel(festival: Festival): string {
  if (festival.status === "ongoing") return "Now on";
  if (festival.daysUntilStart <= 1) return "Tomorrow";
  return `In ${festival.daysUntilStart} days`;
}

// ─── 카드 ─────────────────────────────────────────────────────────────────────

/**
 * 눌렀을 때 할 일. 두 가지뿐이라 둘 중 하나를 고르게 한다.
 *
 *   href      다른 화면으로 넘긴다. 홈에는 상세 시트가 없어 /discover 로 보낸다
 *   onSelect  제자리에서 시트를 연다. discover 가 쓰는 길이다 —
 *             trigger 를 함께 주는 것은 시트가 닫힐 때 포커스를 되돌려야 해서다
 *
 * 둘 다 optional 로 두면 아무것도 안 넘긴 카드와 둘 다 넘긴 카드가 타입으로 허용된다.
 * never 로 서로를 막아 두면 그 둘이 컴파일에서 걸린다.
 */
type FestivalCardProps = { item: Festival } & (
  | { href: string; onSelect?: never }
  | { onSelect: (item: Festival, trigger: HTMLElement) => void; href?: never }
);

/**
 * 축제 카드 폭. 공용 CARD_W(140px)보다 20px 넓다.
 *
 * 사진이 3/4 라 140px 이면 사진만 187px 이고 글자까지 247px 이 된다 — 폭 대 높이가
 * 1 대 1.76 이라 한 장이 기둥처럼 선다. 160px 이면 273px 로 1 대 1.71 이고,
 * 375px 화면에서 두 장 반이 보여 "옆에 더 있다"가 그대로 읽힌다.
 *
 * 관광지 카드는 140px 그대로다. 두 줄이 위아래로 붙어 있지만 사진 비율부터 다르니
 * 폭까지 맞출 이유가 없다 — 맞추면 오히려 같은 종류로 읽힌다.
 */
const FESTIVAL_CARD_W = "w-[160px]";

/**
 * 축제 카드는 관광지 카드와 두 군데가 다르다.
 *
 *   사진 위 뱃지  상태. 진행중은 브랜드색, 예정은 검정 — 한 줄을 훑으며 "지금 하는 것"만
 *                 골라내는 것이 축제를 보는 유일한 방식이다. 글줄에 섞으면 세어야 한다
 *   아랫줄        기간. 관광지 카드의 분류 자리다
 *
 * 뱃지와 아랫줄을 합쳐 한 줄로 쓰지 않는다. 카드 폭이 160px 이라
 * "Now on · Sep 12 – 21" 은 잘린다.
 */
export function FestivalCard(props: FestivalCardProps) {
  const { item } = props;
  const period = formatFestivalPeriod(item);
  const ongoing = item.status === "ongoing";

  // 두 갈래가 같은 문자열을 쓴다 — 링크로 열든 시트로 열든 같은 카드로 보여야 한다
  const shell = `${FESTIVAL_CARD_W} flex-none text-left transition-opacity active:opacity-70`;

  const body = (
    <>
      <CardImage url={item.imageUrl} aspect="3/4" fallbackTitle={item.title}>
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-[3px] text-[10px] font-semibold leading-none ${
            ongoing ? "bg-brand text-black" : "bg-black/70 text-white"
          }`}
        >
          {festivalStatusLabel(item)}
        </span>
      </CardImage>
      <div className={`mt-2 ${TEXT_H}`}>
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3]">{item.title}</p>
        {period && (
          <p className="mt-[3px] truncate text-[11.5px] font-medium leading-[1.25] text-muted-foreground">
            {period}
          </p>
        )}
      </div>
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={(e) => props.onSelect(item, e.currentTarget)} className={shell}>
      {body}
    </button>
  );
}
