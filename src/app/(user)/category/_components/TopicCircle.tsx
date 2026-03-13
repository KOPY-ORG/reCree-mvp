import Link from "next/link";

interface Props {
  href: string;
  name: string;
  colorHex: string;
  colorHex2?: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex: string;
  size?: "sm" | "md";
}

export function TopicCircle({
  href,
  name,
  colorHex,
  colorHex2,
  gradientDir = "to bottom",
  gradientStop = 150,
  textColorHex,
  size = "md",
}: Props) {
  const background = colorHex2
    ? `linear-gradient(${gradientDir}, ${colorHex}, ${colorHex2} ${gradientStop}%)`
    : colorHex;

  const circleClass = size === "sm" ? "size-16 text-[9px]" : "size-20 text-[10px]";
  const containerClass = size === "sm" ? "w-16" : "w-20";

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 shrink-0 ${containerClass} active:scale-95 transition-transform`}
    >
      <div
        className={`${circleClass} rounded-full flex items-center justify-center font-semibold text-center leading-tight px-1.5`}
        style={{ background, color: textColorHex }}
      >
        {name}
      </div>
      <span className="text-[10px] text-center text-foreground leading-tight line-clamp-2 w-full">
        {name}
      </span>
    </Link>
  );
}
