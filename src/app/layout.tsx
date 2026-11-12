import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";

import { SessionProvider } from "@/components/auth/session-provider";
import { DataStoreProvider } from "@/components/data/data-store-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DMRL Management System",
  description: "Prototyp zur Verwaltung von Datenmodul-Anforderungslisten (S1000D)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${notoSans.variable} font-sans antialiased`}>
        <DataStoreProvider>
          <SessionProvider>{children}</SessionProvider>
        </DataStoreProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
