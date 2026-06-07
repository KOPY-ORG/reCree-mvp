"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LOCALES, type EventLocale } from "@/lib/i18n/event-dict";

const LOCALE_LABELS: Record<EventLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  es: "Español",
};

export function EventLangSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLocale = (searchParams.get("lang") ?? "en") as EventLocale;

  function handleSelect(selectedLocale: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("lang", selectedLocale);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            height: 38,
            paddingInline: 14,
            borderRadius: 999,
            background: "rgba(20,16,18,.4)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "none",
            cursor: "pointer",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Globe size={16} />
          {LOCALE_LABELS[currentLocale]}
          <ChevronDown size={13} color="#fff" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{
          background: "rgba(20,16,18,.72)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 14,
          minWidth: 148,
          padding: "4px",
        }}
      >
        <DropdownMenuRadioGroup value={currentLocale} onValueChange={handleSelect}>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuRadioItem
              key={locale}
              value={locale}
              className="text-white focus:bg-white/10 focus:text-white"
            >
              {LOCALE_LABELS[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
