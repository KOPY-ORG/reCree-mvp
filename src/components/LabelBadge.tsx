import { cn } from "@/lib/utils";

interface Props {
  text: string;
  background: string;
  color: string;
  className?: string;
}

export function LabelBadge({ text, background, color, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full font-semibold leading-none text-xs",
        className,
      )}
      style={{ background, color }}
    >
      {text}
    </span>
  );
}
