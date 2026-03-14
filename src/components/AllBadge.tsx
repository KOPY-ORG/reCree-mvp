import Link from "next/link";
import { cn } from "@/lib/utils";

type LinkProps = { href: string; onClick?: never; active?: never };
type ButtonProps = { onClick: () => void; href?: never; active?: boolean };

type Props = (LinkProps | ButtonProps) & {
  className?: string;
  children?: React.ReactNode;
};

const inactiveCls = "bg-brand-sub2 text-brand-foreground border-[0.5px] border-brand active:opacity-70";
const activeCls = "bg-foreground text-background border-foreground";

export function AllBadge({ className, children, ...rest }: Props) {
  const isActive = "active" in rest && rest.active;
  const cls = cn(
    "pill-badge border transition-colors",
    isActive ? activeCls : inactiveCls,
    className
  );

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className={cn(cls, "hover:border-foreground hover:text-foreground")}>
        {children ?? "All"}
      </Link>
    );
  }

  return (
    <button type="button" onClick={(rest as ButtonProps).onClick} className={cls}>
      {children ?? "All"}
    </button>
  );
}
