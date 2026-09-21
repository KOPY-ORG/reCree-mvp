import Link from "next/link";
import { Search } from "lucide-react";

/**
 * 홈 검색 입구.
 *
 * 아직 입력을 받지 않는다 — 누르면 /discover 로 넘긴다. 검색 결과 화면은 별건이고,
 * 그 화면이 생기면 여기가 input 으로 바뀐다. 그때까지 입력창처럼 생긴 링크다.
 *
 * _components/SearchBar.tsx 와는 다른 물건이다. 그쪽은 /discover 안에서
 * "검색어가 이미 걸린 상태"를 보여주는 바다.
 */
export function HomeSearchBar() {
  return (
    <Link
      href="/discover"
      aria-label="Search"
      className="flex items-center gap-3 h-[42px] px-4 rounded-full bg-background shadow-[0_8px_50px_rgba(17,12,46,0.15)] transition-opacity active:opacity-70"
    >
      <Search className="size-5 shrink-0 text-muted-foreground" />
      <span className="text-base text-muted-foreground">Search</span>
    </Link>
  );
}
