"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const check = () => {
      setVisible(window.scrollY > 600);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(check);
        ticking = true;
      }
    };

    // 마운트 시 초기 scrollY 즉시 체크
    setVisible(window.scrollY > 600);

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`
        fixed bottom-[72px] right-2 z-50
        size-10 rounded-full
        flex items-center justify-center
        backdrop-blur-sm
        shadow-[0_4px_16px_rgba(0,0,0,0.18)]
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#C8FF09] focus-visible:ring-offset-1
        ${visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
        }
      `}
      style={{
        /* brand(#C8FF09) → brand-sub(#D0FF6C) 반투명 라임 그라데이션 */
        background: "linear-gradient(135deg, rgba(208,255,108,0.85), rgba(200,255,9,0.85))",
        /* 0.5px 테두리 — Tailwind border는 1px 고정이라 style로 지정 */
        border: "0.5px solid rgba(255,255,255,0.5)",
      }}
    >
      <ArrowUp size={20} color="#2f3a00" strokeWidth={2.0} />
    </button>
  );
}
