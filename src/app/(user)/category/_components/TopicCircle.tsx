import Link from "next/link";

interface Props {
  href: string;
  name: string;
  colorHex?: string;
  colorHex2?: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex?: string;
}

export function TopicCircle({ href, name }: Props) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
    >
      <div
        className="w-full aspect-square rounded-full flex items-center justify-center font-semibold text-center leading-tight px-1.5 text-[10px] bg-zinc-200 text-foreground"
      >
        {name}
      </div>
      <span className="text-[10px] text-center text-foreground leading-tight line-clamp-2 w-full">
        {name}
      </span>
    </Link>
  );
}
