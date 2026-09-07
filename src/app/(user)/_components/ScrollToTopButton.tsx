"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { isBottomNavHidden } from "@/lib/bottom-nav";

/**
 * 기본은 탭바 바로 위 칸이다.
 *
 * /recreeshot 은 그 칸에 New recreeshot FAB 가 상주한다 (NewReCreeshotFab.tsx:6,12).
 * FAB 가 그 화면의 주 액션이라 자리를 비켜주지 않고, 이 버튼을 한 칸 위로 쌓는다 —
 * FAB 높이 40 + 간격 12 = 52.
 *
 * 탭바가 숨는 화면에서는 비켜줄 대상이 없으니 화면 가장자리 여백만 남긴다.
 */
const DEFAULT_BOTTOM = "var(--bottom-nav-space)";
const STACKED_BOTTOM = "calc(var(--bottom-nav-space) + 52px)";
const NO_NAV_BOTTOM = "var(--bottom-nav-bottom)";
const FAB_ROUTES = ["/recreeshot"];

interface Props {
  /** 제공하면 해당 요소의 스크롤 감시, 없으면 window 감시 */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function ScrollToTopButton({ scrollRef }: Props = {}) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const bottom = isBottomNavHidden(pathname)
    ? NO_NAV_BOTTOM
    : FAB_ROUTES.includes(pathname)
      ? STACKED_BOTTOM
      : DEFAULT_BOTTOM;

  useEffect(() => {
    let rafId = 0;
    let ticking = false;

    const check = () => {
      const top = scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY;
      setVisible(top > 600);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(check);
        ticking = true;
      }
    };

    if (scrollRef) {
      const attach = () => {
        if (!scrollRef.current) { rafId = requestAnimationFrame(attach); return; }
        check();
        scrollRef.current.addEventListener("scroll", handleScroll, { passive: true });
      };
      attach();
      return () => {
        cancelAnimationFrame(rafId);
        scrollRef.current?.removeEventListener("scroll", handleScroll);
      };
    } else {
      setVisible(window.scrollY > 600);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleScroll);
        cancelAnimationFrame(rafId);
      };
    }
  }, [scrollRef]);

  function handleClick() {
    if (scrollRef?.current) scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="fixed inset-x-0 z-50 h-10 pointer-events-none" style={{ bottom }}>
      <div className="max-w-[540px] mx-auto h-full relative">
        <button
          type="button"
          aria-label="맨 위로"
          onClick={handleClick}
          className={`
            absolute bottom-0 right-2 pointer-events-auto
            size-10 rounded-full
            flex items-center justify-center
            backdrop-blur-sm
            bg-white/80
            shadow-[0_4px_16px_rgba(0,0,0,0.18)]
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[#D3FD52] focus-visible:ring-offset-1
            ${visible
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-2 pointer-events-none"
            }
          `}
          style={{ border: "0.5px solid rgba(255,255,255,0.5)" }}
        >
          <ArrowUp size={20} color="#2f3a00" strokeWidth={2.0} />
        </button>
      </div>
    </div>
  );
}
