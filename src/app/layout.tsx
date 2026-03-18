import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_KR } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "reCree",
  description: "reCree MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSans.variable} ${notoSansKR.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-center"
          icons={{ success: null, error: null, info: null, warning: null, loading: null }}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-2xl px-4 py-2.5 shadow-lg text-center max-w-[280px]",
            },
          }}
        />
      </body>
    </html>
  );
}
