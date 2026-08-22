"use client";

import React from "react";
import type { MpConnState } from "@/lib/use-multiplayer";

/** Small unobtrusive connection status chip. */
export function MpStatusBadge({ conn }: { conn: MpConnState }) {
  const map: Record<MpConnState, { dot: string; label: string; color: string }> = {
    idle:         { dot: "#8b7fa8", label: "…",              color: "#8b7fa8" },
    connecting:   { dot: "#ffc44d", label: "CONNECTING",     color: "#ffc44d" },
    connected:    { dot: "#39ff14", label: "CONNECTED",      color: "#7ef7a0" },
    reconnecting: { dot: "#ffc44d", label: "RECONNECTING",   color: "#ffc44d" },
    unavailable:  { dot: "#ff4060", label: "OFFLINE",        color: "#ff7a91" },
    disconnected: { dot: "#ff4060", label: "CONNECTION LOST",color: "#ff7a91" },
  };
  const s = map[conn];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-bold"
      style={{ color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}`, animation: conn === "connected" ? "pulse-glow 2s infinite" : undefined }} />
      {s.label}
    </span>
  );
}
