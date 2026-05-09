import Script from "next/script";
import { getCurrentUser } from "@/lib/auth";
import { GAPageViewTracker } from "./GAPageViewTracker";

export async function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return null;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "EDITOR") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { send_page_view: false });
        `}
      </Script>
      <GAPageViewTracker id={id} />
    </>
  );
}
