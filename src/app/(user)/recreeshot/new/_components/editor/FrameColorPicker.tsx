"use client";

import { Check } from "lucide-react";

const COLORS = [
  "#ffffff",
  "#f5f0e8",
  "#fce4ec",
  "#e0f2e9",
  "#e3f2fd",
  "#f3e8ff",
  "#C8FF09",
  "#e8e8e8",
  "#111111",
];

interface Props {
  value: string;
  onChange: (hex: string) => void;
  extraColors?: string[];
}

export function FrameColorPicker({ value, onChange, extraColors = [] }: Props) {
  const seen = new Set(COLORS.map((c) => c.toLowerCase()));
  const extras = extraColors.filter((c) => {
    const lower = c.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
  const allColors = [...COLORS, ...extras];
  return (
    <div className="flex flex-wrap gap-3 py-1">
      {allColors.map((color, i) => {
        const isSelected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={`${color}-${i}`}
            type="button"
            onClick={() => onChange(color)}
            className={`size-9 rounded-full flex items-center justify-center transition-transform ${
              isSelected
                ? "scale-110 ring-2 ring-brand ring-offset-2 ring-offset-background"
                : ""
            }`}
            style={{
              backgroundColor: color,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
            }}
          >
            {isSelected && (
              <Check
                className="size-3.5"
                strokeWidth={3}
                style={{ color: color === "#111111" ? "#ffffff" : "#00000066" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
