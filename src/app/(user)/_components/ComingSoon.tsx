import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, icon: Icon = Sparkles }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4 px-8 text-center">
      <div className="size-16 rounded-full bg-brand/10 flex items-center justify-center">
        <Icon className="size-7 text-brand" />
      </div>
      <div className="space-y-1.5">
        <p className="font-bold text-lg">{title}</p>
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}
