import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { SafeProvider } from "@/contexts/SafeContext";
import { ContractorProvider } from "@/contexts/ContractorContext";
import { AuthProvider } from "@/contexts/AuthContext";

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
      <body
        className={`${cairo.variable} font-sans antialiased bg-gray-50 text-gray-900 min-h-full`}
      >
        <AuthProvider>
          <SafeProvider>
            <ContractorProvider>
              <MainLayout>{children}</MainLayout>
            </ContractorProvider>
          </SafeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
