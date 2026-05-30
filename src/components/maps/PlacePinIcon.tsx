interface PlacePinIconProps {
  color: string;
  size?: number;
  className?: string;
}

export function PlacePinIcon({ color, size = 14, className }: PlacePinIconProps) {
  return (
    <svg
      width={size}
      height={(size * 36) / 28}
      viewBox="0 0 28 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 21.5 14 36 14 36C14 36 28 21.5 28 14C28 6.268 21.732 0 14 0Z"
        fill={color}
      />
    </svg>
  );
}
