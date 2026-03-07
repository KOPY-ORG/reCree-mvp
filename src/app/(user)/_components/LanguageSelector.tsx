"use client";

import { Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "中文", short: "中" },
  { code: "ja", label: "日本語", short: "日" },
];

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setCurrent(saved);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (code: string) => {
    setCurrent(code);
    localStorage.setItem("lang", code);
    setOpen(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        aria-label="언어 선택"
      >
        <Globe className="size-4" />
        <span className="text-xs font-medium">{currentLang.short}</span>
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-32 rounded-lg bg-background shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => select(code)}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${
                current === code ? "bg-brand text-black font-medium" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
