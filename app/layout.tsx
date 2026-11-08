import type { Metadata, Viewport } from "next";
import { Anton, Barlow } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const barlow = Barlow({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: { default: "Richmond Live Academy", template: "%s · Richmond Live Academy" },
  description: "Course portal for Richmond Live Academy students, mentors and admins.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0E",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${barlow.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
