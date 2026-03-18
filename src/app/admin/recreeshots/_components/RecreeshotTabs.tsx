interface Tab {
  label: string;
  value: string;
  count: number;
  highlight?: boolean;
}

interface Props {
  tabs: Tab[];
  current: string;
}

export function RecreeshotTabs({ tabs, current }: Props) {
  return (
    <div className="flex border-b border-zinc-200">
      {tabs.map(({ label, value, count, highlight }) => (
        <a
          key={value}
          href={`?status=${value}`}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
            current === value
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-700"
          }`}
        >
          {label}
          {count > 0 && (
            <span className={`text-xs font-normal ${highlight && current !== value ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
              ({count})
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
