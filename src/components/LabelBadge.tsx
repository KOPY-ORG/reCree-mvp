import { cn } from "@/lib/utils";

const BASE =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold leading-none text-xs";

type BaseProps = {
  text: string;
  background: string;
  color: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

type SpanProps = BaseProps & { as?: "span" };
type ButtonProps = BaseProps & {
  as: "button";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
};

type Props = SpanProps | ButtonProps;

export function LabelBadge({ text, background, color, className, style: extraStyle, children, ...rest }: Props) {
  const style = { background, color, ...extraStyle };
  const cls = cn(BASE, className);

  if (rest.as === "button") {
    const { as: _as, onClick, type = "button" } = rest as ButtonProps;
    return (
      <button type={type} onClick={onClick} className={cls} style={style}>
        {text}
        {children}
      </button>
    );
  }

  return (
    <span className={cls} style={style}>
      {text}
      {children}
    </span>
  );
}
