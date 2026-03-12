"use client";

interface Props {
  url: string;
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/shorts/")[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function YouTubeEmbed({ url }: Props) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  return (
    <div className="aspect-video rounded-xl overflow-hidden w-full">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}
