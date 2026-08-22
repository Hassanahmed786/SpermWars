"use client";

import { WalletProvider } from "./wallet-provider";

import React, { useEffect, type ReactNode } from "react";
import { ToastProvider } from "./toast";
import { MemeProvider } from "@/lib/meme-engine";

/** Global client providers that wrap every page (mounted in the root layout). */
export default function RootProviders({ children }: { children: ReactNode }) {
  // Respect prefers-reduced-motion by tagging <html> so CSS can dial back effects.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => document.documentElement.classList.toggle("reduce-motion", mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return (
    <ToastProvider>
      <MemeProvider>
        <WalletProvider>{children}</WalletProvider>
      </MemeProvider>
    </ToastProvider>
  );
}
