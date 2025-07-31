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
  title: "نظام الإدارة المالية | أعمال البناء والتشييد",
  description:
    "نظام شامل للإدارة المالية لشركات البناء والتشييد - إدارة المشاريع، التدفق النقدي، الموظفين والمصروفات",
  keywords:
    "الإدارة المالية، البناء والتشييد، المشاريع، التدفق النقدي، المحاسبة",
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
