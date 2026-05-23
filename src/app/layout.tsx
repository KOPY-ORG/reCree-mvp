import type { Metadata } from "next";
import { Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/toast-provider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { VercelAnalytics } from "@/components/VercelAnalytics";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const isProduction = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL("https://recree.io"),
  robots: isProduction ? undefined : { index: false, follow: false },
  title: {
    default: "reCree",
    template: "%s | reCree",
  },
  description: "Discover iconic K-content spots",
  openGraph: {
    title: "reCree",
    description: "Discover iconic K-content spots",
    url: "https://recree.io",
    siteName: "reCree",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "reCree",
    description: "Discover iconic K-content spots",
    images: ["/og-default.png"],
  },
  verification: {
    google: "XL4ExE1K15vfuyaO7KZ2dyDkukn2VLpQEpqY7AVxYqc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${notoSansKR.variable} font-sans antialiased`} suppressHydrationWarning>
        <GoogleAnalytics />
        <ToastProvider>{children}</ToastProvider>
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
