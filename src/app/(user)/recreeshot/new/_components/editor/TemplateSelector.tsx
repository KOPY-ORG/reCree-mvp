"use client";

import { Check } from "lucide-react";
import type { TemplateId } from "./editor-types";

interface TemplateOption {
  id: TemplateId;
  label: string;
  description: string;
  preview: React.ReactNode;
}

function PersonIcon({ color, size = 40 }: { color: string; size?: number }) {
  const h = Math.round(size * 1.4);
  return (
    <svg viewBox="0 0 40 56" width={size} height={h} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="12" r="9" stroke={color} strokeWidth="2.5" />
      <path d="M6 48 C6 36 10 30 20 30 C30 30 34 36 34 48" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PersonIconFull({ color, size = 32 }: { color: string; size?: number }) {
  const h = Math.round(size * 2);
  return (
    <svg viewBox="0 0 40 80" width={size} height={h} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* head */}
      <circle cx="20" cy="9" r="7.5" stroke={color} strokeWidth="2.5" />
      {/* torso */}
      <path d="M20 18 L20 46" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* arms */}
      <path d="M20 24 L8 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 24 L32 34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* legs */}
      <path d="M20 46 L12 68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 46 L28 68" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function VerticalFullPreview() {
  return (
    <div className="w-full aspect-[4/5] flex flex-col bg-background overflow-hidden rounded-lg">
      <div className="flex-1 bg-[#d4f986] flex items-center justify-center">
        <PersonIcon color="#5a8a00" size={52} />
      </div>
      <div className="flex-1 bg-[#c8ebf5] flex items-center justify-center">
        <PersonIcon color="#2b7a9e" size={52} />
      </div>
    </div>
  );
}

function VerticalFramePreview() {
  return (
    <div className="w-full aspect-[4/5] bg-white flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg">
      <div className="w-full flex-1 bg-[#d4f986] rounded-sm flex items-center justify-center">
        <PersonIcon color="#5a8a00" size={32} />
      </div>
      <p className="text-[8px] font-medium text-black leading-none">Artist</p>
      <div className="w-full flex-1 bg-[#c8ebf5] rounded-sm flex items-center justify-center">
        <PersonIcon color="#2b7a9e" size={32} />
      </div>
      <p className="text-[8px] font-medium text-black leading-none">ME</p>
    </div>
  );
}

function HorizontalFullPreview() {
  return (
    <div className="w-full aspect-[5/4] flex flex-row bg-background overflow-hidden rounded-lg">
      <div className="flex-1 bg-[#d4f986] flex items-center justify-center">
        <PersonIconFull color="#5a8a00" size={40} />
      </div>
      <div className="flex-1 bg-[#c8ebf5] flex items-center justify-center">
        <PersonIconFull color="#2b7a9e" size={40} />
      </div>
    </div>
  );
}

function HorizontalFramePreview() {
  return (
    <div className="w-full aspect-[5/4] bg-white flex flex-row items-center justify-center gap-2 p-3 rounded-lg">
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full aspect-[3/4] bg-[#d4f986] rounded-sm flex items-center justify-center">
          <PersonIconFull color="#5a8a00" size={24} />
        </div>
        <p className="text-[8px] font-medium text-black leading-none">Artist</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full aspect-[3/4] bg-[#c8ebf5] rounded-sm flex items-center justify-center">
          <PersonIconFull color="#2b7a9e" size={24} />
        </div>
        <p className="text-[8px] font-medium text-black leading-none">ME</p>
      </div>
    </div>
  );
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "vertical-full",
    label: "Vertical",
    description: "Full bleed",
    preview: <VerticalFullPreview />,
  },
  {
    id: "vertical-frame",
    label: "Vertical",
    description: "Framed",
    preview: <VerticalFramePreview />,
  },
  {
    id: "horizontal-full",
    label: "Horizontal",
    description: "Full bleed",
    preview: <HorizontalFullPreview />,
  },
  {
    id: "horizontal-frame",
    label: "Horizontal",
    description: "Framed",
    preview: <HorizontalFramePreview />,
  },
];

interface Props {
  selected: TemplateId;
  onSelect: (id: TemplateId) => void;
  onNext: () => void;
}

export function TemplateSelector({ selected, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <p className="text-sm text-muted-foreground mb-4">Choose a layout for your recreeshot</p>

        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => {
            const isSelected = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(t.id)}
                className={`relative flex flex-col gap-2 p-2 rounded-2xl border-2 transition-all text-left ${
                  isSelected ? "border-brand bg-brand/5" : "border-border bg-muted/20"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 size-5 rounded-full bg-brand flex items-center justify-center">
                    <Check className="size-3 text-black" strokeWidth={3} />
                  </div>
                )}

                <div className="w-full">{t.preview}</div>

                <div className="px-1 pb-1">
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
        >
          Next
        </button>
      </div>
    </div>
  );
}
