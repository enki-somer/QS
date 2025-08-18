import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { SafeProvider } from "@/contexts/SafeContext";
import { ContractorProvider } from "@/contexts/ContractorContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PWAInstaller from "@/components/PWAInstaller";
import NetworkStatus from "@/components/layout/NetworkStatus";
import Script from "next/script";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "قصر الشام",
  description:
    "نظام شامل للإدارة المالية لشركات البناء والتشييد - إدارة المشاريع، التدفق النقدي، الموظفين والمصروفات",
  keywords:
    "الإدارة المالية، البناء والتشييد، المشاريع، التدفق النقدي، المحاسبة",
  manifest: "/manifest.json",
  themeColor: "#182C61",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "قصر الشام",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "قصر الشام - نظام الإدارة المالية",
    title: "قصر الشام - نظام الإدارة المالية",
    description: "نظام شامل للإدارة المالية لشركات البناء والتشييد",
  },
  icons: {
    icon: "/icons/android/android-launchericon-192-192.png",
    shortcut: "/icons/android/android-launchericon-192-192.png",
    apple: "/icons/ios/192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="قصر الشام" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Icons */}
        <link rel="apple-touch-icon" href="/icons/ios/180.png" />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/ios/152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/ios/180.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/icons/ios/167.png"
        />

        {/* iOS Splash Screens */}
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Theme Colors */}
        <meta name="theme-color" content="#182C61" />
        <meta name="msapplication-navbutton-color" content="#182C61" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body
        className={`${cairo.variable} font-sans antialiased bg-gray-50 text-gray-900 min-h-full`}
      >
        {/* Service Worker Registration */}
        <Script id="sw-registration" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `}
        </Script>

        <AuthProvider>
          <SafeProvider>
            <ContractorProvider>
              <MainLayout>{children}</MainLayout>
              <NetworkStatus />
              <PWAInstaller />
            </ContractorProvider>
          </SafeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
