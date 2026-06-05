"use client";

import { useEffect } from "react";

type InstagramWindow = Window & {
  instgrm?: { Embeds: { process: () => void } };
};

export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (!url) return;

    const win = window as InstagramWindow;

    if (win.instgrm) {
      win.instgrm.Embeds.process();
      return;
    }

    if (document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => {
      (window as InstagramWindow).instgrm?.Embeds.process();
    };
    document.body.appendChild(script);
  }, [url]);

  if (!url) return null;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", width: "100%" }}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ minHeight: 480 }}
      />
    </div>
  );
}
