"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function ListScrollTopButton({ scrollRef }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let rafId = 0;
    let scrollRafId = 0;
    let el: HTMLDivElement | null = null;

    const handleScroll = () => {
      cancelAnimationFrame(scrollRafId);
      scrollRafId = requestAnimationFrame(() => {
        if (el) setVisible(el.scrollTop > 600);
      });
    };

    const attach = () => {
      el = scrollRef.current;
      if (!el) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      setVisible(el.scrollTop > 600);
      el.addEventListener("scroll", handleScroll, { passive: true });
    };

    attach();

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(scrollRafId);
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, [scrollRef]);

  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      className={`
        fixed bottom-[72px] right-2 z-50
        size-10 rounded-full
        flex items-center justify-center
        backdrop-blur-sm
        bg-white/80
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
        border: "0.5px solid rgba(255,255,255,0.5)",
      }}
    >
      <ArrowUp size={20} color="#2f3a00" strokeWidth={2.0} />
    </button>
  );
}
