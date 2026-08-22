import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import RootProviders from "@/components/root-providers";

export const metadata: Metadata = {
  title: "Sperm Wars — Monad Edition",
  description: "8 Sperm. 1 Egg. Infinite Chaos. A cinematic multiplayer arcade game on Monad.",
};

export const viewport: Viewport = {
  themeColor: "#0f0020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0020] text-white antialiased min-h-screen">
        <RootProviders>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
