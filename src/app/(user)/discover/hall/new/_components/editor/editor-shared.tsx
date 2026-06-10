export const FONT_TECH = "var(--font-chakra-petch), 'Chakra Petch', sans-serif";
export const FONT_MONO = "var(--font-space-mono), 'Space Mono', monospace";

export function PersonIcon({ color, size = 14, strokeWidth = 2.5 }: {
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 40 56" width={size} height={Math.round(size * 1.4)} fill="none" aria-hidden>
      <circle cx="20" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <path d="M6 48 C6 36 10 30 20 30 C30 30 34 36 34 48" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function PersonIconFull({ color, size = 14, strokeWidth = 2.5 }: {
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 40 80" width={size} height={Math.round(size * 2)} fill="none" aria-hidden>
      <circle cx="20" cy="9" r="7.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M20 18 L20 46" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 24 L8 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 24 L32 34" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 46 L12 68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M20 46 L28 68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function StepNextButton({ label, onClick, disabled }: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <div style={{ padding: "12px 16px", flexShrink: 0 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 9999,
          background: disabled ? "#e5e5e5" : "#C6FD09",
          border: "none",
          fontWeight: 700,
          fontSize: 16,
          color: disabled ? "#aaa" : "#0b0b0b",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
}
