"use client";

import React, { useState } from "react";
import { useWallet } from "./wallet-provider";
import { MONAD } from "@/lib/monad-chain";
import { sfx } from "@/lib/audio";

/** Compact connect/status pill used in headers and sidebars. */
export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const w = useWallet();
  const [menu, setMenu] = useState(false);

  if (!w.isConnected) {
    return (
      <button
        onMouseEnter={() => sfx("hover")}
        onClick={() => { sfx("click"); w.openModal(); }}
        className="glow-btn text-[11px] py-2 px-4 whitespace-nowrap"
      >
        🔗 CONNECT WALLET
      </button>
    );
  }

  // wrong network banner-button
  if (!w.isDemoMode && !w.onMonad) {
    return (
      <button
        onMouseEnter={() => sfx("hover")}
        onClick={() => { sfx("click"); void w.switchNetwork(); }}
        className="text-[11px] py-2 px-4 rounded-xl font-black tracking-wide whitespace-nowrap animate-pulse"
        style={{ background: "linear-gradient(135deg,#ffb020,#ff7a00)", color: "#1a0b26", boxShadow: "0 0 22px rgba(255,176,32,.5)" }}
      >
        ⚠ SWITCH TO MONAD
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onMouseEnter={() => sfx("hover")}
        onClick={() => { sfx("click"); setMenu((m) => !m); }}
        className="flex items-center gap-2 rounded-xl py-1.5 px-3 transition hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,.16), rgba(139,92,246,.06))",
          border: "1px solid rgba(139,92,246,.35)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        {!compact && <span className="text-[11px] text-yellow-400 font-bold">💎 {w.balance}</span>}
        <span className="text-[11px] font-mono text-purple-200">{w.shortAddress}</span>
        {w.isDemoMode && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-bold">DEMO</span>
        )}
        <span className="text-purple-300/50 text-[9px]">▾</span>
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div
            className="absolute right-0 mt-2 w-64 rounded-2xl p-3 z-50 modal-pop"
            style={{
              background: "linear-gradient(160deg, rgba(24,8,44,.98), rgba(10,2,22,.98))",
              border: "1px solid rgba(139,92,246,.35)",
              boxShadow: "0 20px 60px -18px rgba(0,0,0,.85)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-widest text-purple-400/60">
                {w.isDemoMode ? "DEMO WALLET" : w.networkName.toUpperCase()}
              </span>
              {!w.isDemoMode && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: w.onMonad ? "rgba(57,255,20,.14)" : "rgba(255,176,32,.14)",
                    color: w.onMonad ? "#7ef7a0" : "#ffc44d",
                    border: `1px solid ${w.onMonad ? "rgba(57,255,20,.3)" : "rgba(255,176,32,.3)"}`,
                  }}>
                  {w.onMonad ? "● Monad" : "⚠ Wrong net"}
                </span>
              )}
            </div>

            <div className="rounded-xl p-2.5 mb-2" style={{ background: "rgba(139,92,246,.08)" }}>
              <p className="text-[9px] text-purple-400/60">BALANCE</p>
              <p className="text-lg font-black text-yellow-400">💎 {w.balance} <span className="text-xs text-yellow-500/70">MON</span></p>
              <p className="text-[10px] font-mono text-purple-300 mt-1 break-all">{w.address}</p>
            </div>

            {w.isDemoMode && (
              <p className="text-[9px] text-yellow-500/70 bg-yellow-500/10 rounded-lg px-2 py-1.5 mb-2 leading-snug">
                Demo mode — balance is placeholder, no on-chain transactions occur.
              </p>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => { sfx("click"); w.copyAddress(); }}
                className="text-[10px] py-2 rounded-lg transition hover:bg-purple-500/15"
                style={{ border: "1px solid rgba(139,92,246,.25)", color: "#c4b5fd" }}>
                📋 Copy
              </button>
              <a
                href={w.addressExplorerUrl() ?? "#"}
                target="_blank" rel="noopener noreferrer"
                onClick={() => { if (w.isDemoMode) sfx("click"); }}
                className={`text-[10px] py-2 rounded-lg transition text-center ${w.isDemoMode ? "opacity-40 pointer-events-none" : "hover:bg-purple-500/15"}`}
                style={{ border: "1px solid rgba(139,92,246,.25)", color: "#c4b5fd" }}>
                🔍 Explorer
              </a>
              {!w.isDemoMode && !w.onMonad && (
                <button onClick={() => { sfx("click"); void w.switchNetwork(); }}
                  className="col-span-2 text-[10px] py-2 rounded-lg font-bold"
                  style={{ background: "linear-gradient(135deg,#ffb020,#ff7a00)", color: "#1a0b26" }}>
                  ⚠ Switch to {MONAD.name}
                </button>
              )}
              {!w.isDemoMode && (
                <button onClick={() => { sfx("click"); void w.refreshBalance(); }}
                  className="col-span-2 text-[10px] py-2 rounded-lg transition hover:bg-purple-500/15"
                  style={{ border: "1px solid rgba(139,92,246,.25)", color: "#c4b5fd" }}>
                  ↻ Refresh balance
                </button>
              )}
              <button onClick={() => { sfx("click"); setMenu(false); w.disconnect(); }}
                className="col-span-2 text-[10px] py-2 rounded-lg transition hover:bg-red-500/15"
                style={{ border: "1px solid rgba(255,64,96,.3)", color: "#ff7a91" }}>
                ⏻ Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
