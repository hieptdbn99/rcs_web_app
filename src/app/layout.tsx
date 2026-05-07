import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "RCS Worker Panel",
  description: "Bảng điều khiển robot RCS cho vận hành viên",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 3000, className: 'modern-toast' }} />
      </body>
    </html>
  );
}
