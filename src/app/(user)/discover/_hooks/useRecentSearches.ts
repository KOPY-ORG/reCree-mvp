"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "recree:recent-searches";
const MAX_ITEMS = 5;

interface UseRecentSearches {
  recents: string[];
  addRecent: (term: string) => void;
  removeRecent: (term: string) => void;
  clearRecents: () => void;
}

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeToStorage(items: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 사파리 프라이빗 모드 등에서 throw 가능 — 조용히 무시
  }
}

export function useRecentSearches(): UseRecentSearches {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(readFromStorage());
  }, []);

  const addRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecents((prev) => {
      const deduped = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );
      const next = [trimmed, ...deduped].slice(0, MAX_ITEMS);
      writeToStorage(next);
      return next;
    });
  };

  const removeRecent = (term: string) => {
    setRecents((prev) => {
      const next = prev.filter(
        (item) => item.toLowerCase() !== term.trim().toLowerCase()
      );
      writeToStorage(next);
      return next;
    });
  };

  const clearRecents = () => {
    setRecents([]);
    writeToStorage([]);
  };

  return { recents, addRecent, removeRecent, clearRecents };
}
