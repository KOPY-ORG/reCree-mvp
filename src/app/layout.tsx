import type { Metadata } from "next";
import { Noto_Sans_KR, Chakra_Petch, Space_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/toast-provider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ClarityAnalytics } from "@/components/ClarityAnalytics";
import { VercelAnalytics } from "@/components/VercelAnalytics";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const isProduction = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  robots: isProduction ? undefined : { index: false, follow: false },
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: "Discover iconic K-content spots",
  openGraph: {
    title: BRAND.name,
    description: "Discover iconic K-content spots",
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
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
      <body className={`${GeistSans.variable} ${notoSansKR.variable} ${chakraPetch.variable} ${spaceMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <GoogleAnalytics />
        <ClarityAnalytics />
        <ToastProvider>{children}</ToastProvider>
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
