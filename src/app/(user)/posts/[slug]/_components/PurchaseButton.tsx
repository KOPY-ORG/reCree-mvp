import { ExternalLink } from "lucide-react";

interface Props {
  purchaseUrl: string;
  isAffiliate: boolean;
}

export function PurchaseButton({ purchaseUrl, isAffiliate }: Props) {
  if (!purchaseUrl.startsWith("https://")) return null;

  return (
    <div className="mx-4 mt-3">
      <a
        href={purchaseUrl}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="w-full py-2.5 rounded-full bg-brand text-black text-sm font-semibold text-center flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80"
      >
        View Product
        <ExternalLink className="size-4" />
      </a>
      {isAffiliate && (
        <p className="text-xs text-muted-foreground text-center mt-1.5">
          If you purchase through this link, reCree may earn a commission.
        </p>
      )}
    </div>
  );
}
