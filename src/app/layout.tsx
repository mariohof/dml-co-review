import type { Metadata } from "next";
import localFont from "next/font/local";

import { SessionProvider } from "@/components/auth/session-provider";
import { DataStoreProvider } from "@/components/data/data-store-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Schrift lokal mitgeliefert (SIL OFL 1.1, siehe fonts/OFL.txt): der Build braucht so keine Internetverbindung (PROJ-19, Offline-Betrieb)
const notoSans = localFont({
  src: "./fonts/NotoSans-latin-wght.woff2",
  weight: "100 900",
  style: "normal",
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
