"use client";

import { useState } from "react";

interface Props {
  imageUrl?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ imageUrl, name, size = 32, className = "" }: Props) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name[0].toUpperCase() : "?";
  const dim = { width: size, height: size };

  if (imageUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name ?? "User"}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={dim}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-muted flex items-center justify-center shrink-0 font-medium text-muted-foreground ${className}`}
      style={{ ...dim, fontSize: Math.max(10, Math.round(size * 0.375)) }}
    >
      {initial}
    </div>
  );
}
