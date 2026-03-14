import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ─── ColorPicker ───────────────────────────────────────────────────────────────

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs h-8"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── TextColorPicker ───────────────────────────────────────────────────────────

export function TextColorPicker({
  value,
  onChange,
  showInherit = false,
  showPicker = true,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  showInherit?: boolean;
  showPicker?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">글자색</Label>
      <div className="flex gap-2">
        {showInherit && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
              value === null
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            그룹 상속
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange("#000000")}
          className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
            value === "#000000"
              ? "bg-black text-white border-black ring-2 ring-black/30"
              : "bg-white text-black border-border"
          }`}
        >
          검정
        </button>
        <button
          type="button"
          onClick={() => onChange("#FFFFFF")}
          className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
            value === "#FFFFFF"
              ? "bg-white text-black border-gray-400 ring-2 ring-gray-300"
              : "bg-gray-100 text-gray-500 border-border"
          }`}
        >
          흰색
        </button>
        <button
          type="button"
          onClick={() => onChange("#C8FF09")}
          className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
            value === "#C8FF09"
              ? "ring-2 ring-[#C8FF09]/50 border-[#C8FF09]"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
          style={value === "#C8FF09" ? { background: "#C8FF09", color: "#000000" } : {}}
        >
          메인
        </button>
      </div>
      {showPicker && value !== null && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs h-8"
            maxLength={7}
          />
        </div>
      )}
    </div>
  );
}

// ─── GradientColorSection ──────────────────────────────────────────────────────

export function GradientColorSection({
  colorHex,
  onColorHex,
  colorHex2,
  onColorHex2,
  isGradient,
  onGradientToggle,
  gradientDir,
  onGradientDir,
  gradientStop,
  onGradientStop,
}: {
  colorHex: string;
  onColorHex: (v: string) => void;
  colorHex2: string;
  onColorHex2: (v: string) => void;
  isGradient: boolean;
  onGradientToggle: (v: boolean) => void;
  gradientDir: "to bottom" | "to right";
  onGradientDir: (v: "to bottom" | "to right") => void;
  gradientStop: number;
  onGradientStop: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* 단색 / 그라데이션 토글 */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onGradientToggle(false)}
          className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
            !isGradient
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          단색
        </button>
        <button
          type="button"
          onClick={() => onGradientToggle(true)}
          className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
            isGradient
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          그라데이션
        </button>
      </div>

      {/* 색 피커 */}
      <div className={`grid gap-3 ${isGradient ? "grid-cols-2" : "grid-cols-1"}`}>
        <ColorPicker
          label={isGradient ? "시작 색" : "배경색"}
          value={colorHex}
          onChange={onColorHex}
        />
        {isGradient && (
          <ColorPicker label="끝 색" value={colorHex2} onChange={onColorHex2} />
        )}
      </div>

      {/* 그라데이션 방향 + 범위 */}
      {isGradient && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">방향</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onGradientDir("to bottom")}
                className={`flex-1 py-1 rounded text-xs font-medium border transition-all ${
                  gradientDir === "to bottom"
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                세로 ↓
              </button>
              <button
                type="button"
                onClick={() => onGradientDir("to right")}
                className={`flex-1 py-1 rounded text-xs font-medium border transition-all ${
                  gradientDir === "to right"
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                가로 →
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">끝 위치 (%)</Label>
            <input
              type="number"
              min={50}
              max={300}
              step={10}
              value={gradientStop}
              onChange={(e) => onGradientStop(Number(e.target.value))}
              className="w-full h-8 rounded border border-border px-2 text-xs font-mono bg-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
