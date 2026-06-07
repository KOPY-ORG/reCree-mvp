"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "recree:discover-view";
const VALID_CONTENT_TABS = ["hot", "list"] as const;
type ContentTab = "hot" | "list";

interface StoredState {
  query: string;
  contentTab: ContentTab;
  scrollTop: number;
}

export interface DiscoverViewState {
  restored: StoredState | null;
  save: (state: StoredState) => void;
  clear: () => void;
}

function readFromStorage(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    const query =
      typeof obj.query === "string" && obj.query.length <= 200
        ? obj.query
        : "";

    const contentTab =
      typeof obj.contentTab === "string" &&
      (VALID_CONTENT_TABS as readonly string[]).includes(obj.contentTab)
        ? (obj.contentTab as ContentTab)
        : "list";

    const scrollTop =
      typeof obj.scrollTop === "number" &&
      Number.isFinite(obj.scrollTop) &&
      obj.scrollTop >= 0
        ? obj.scrollTop
        : 0;

    return { query, contentTab, scrollTop };
  } catch {
    return null;
  }
}

export function useDiscoverViewState(): DiscoverViewState {
  const [restored] = useState(() => readFromStorage());

  const save = useCallback((state: StoredState): void => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ query: state.query, contentTab: state.contentTab, scrollTop: state.scrollTop })
      );
    } catch {
      // storage 접근 실패 시 조용히 무시
    }
  }, []);

  const clear = useCallback((): void => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage 접근 실패 시 조용히 무시
    }
  }, []);

  return { restored, save, clear };
}
