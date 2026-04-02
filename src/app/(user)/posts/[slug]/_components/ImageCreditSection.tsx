interface CreditItem {
  creditText: string;
}

interface Props {
  credits: CreditItem[];
}

export function ImageCreditSection({ credits }: Props) {
  if (credits.length === 0) return null;

  return (
    <details className="px-4 mt-2 mb-4 group">
      <summary className="flex items-center gap-1.5 cursor-pointer list-none text-[11px] text-muted-foreground select-none w-fit">
        <span>Photo Credits</span>
        <svg
          className="h-3 w-3 transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
        {credits.map((item, i) => (
          <li key={i} className="text-[11px] text-muted-foreground">
            {item.creditText}
          </li>
        ))}
      </ul>
    </details>
  );
}
