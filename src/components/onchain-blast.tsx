"use client";

import React, { useState } from "react";
import { useWallet, MON_SINK } from "./wallet-provider";
import { MONAD } from "@/lib/monad-chain";
import { audio } from "@/lib/audio";

/**
 * On-chain MONAD BLAST trigger — an OPTIONAL overlay shown during a match.
 *
 * It is deliberately separate from the in-game `M` blast (which spends earned,
 * off-chain MON and drives gameplay). This button performs a REAL 0.001 MON
 * testnet transaction to demonstrate meaningful blockchain usage without ever
 * touching movement, physics or match outcome. If in demo mode / not on Monad,
 * it explains that honestly via toasts instead of faking a transaction.
 */
const BLAST_COST = Number(process.env.NEXT_PUBLIC_BLAST_COST || 0.001);

export default function OnchainBlast({ onConfirmed }: { onConfirmed?: () => void }) {
  const w = useWallet();
  const [busy, setBusy] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);

  const fire = async () => {
    if (busy) return;
    // Not connected -> open modal instead of faking anything
    if (!w.isConnected) { w.openModal(); return; }
    setBusy(true);
    audio.play("monadBlast");
    const res = await w.sendMon(MON_SINK, BLAST_COST, "Monad Blast");
    if (res.ok && res.hash) {
      setLastHash(res.hash);
      onConfirmed?.();
    }
    setBusy(false);
  };

  const label = w.isDemoMode
    ? "DEMO — connect wallet"
    : !w.onMonad && w.isConnected
    ? "Switch to Monad"
    : busy
    ? "CONFIRMING…"
    : `${BLAST_COST} MON`;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-auto">
      <button
        onClick={fire}
        disabled={busy}
        className="group relative px-5 py-2.5 rounded-xl font-black text-xs tracking-[0.12em] uppercase transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
        style={{
          background: "linear-gradient(135deg,#a855f7,#7c3aed 55%,#6d28d9)",
          color: "#fff",
          boxShadow: "0 0 26px rgba(139,92,246,.55), inset 0 1px 0 rgba(255,255,255,.15)",
          border: "1px solid rgba(167,139,250,.5)",
        }}
        title="Fire a real Monad testnet transaction"
      >
        <span className="absolute inset-0 rounded-xl overflow-hidden">
          <span className="absolute inset-0" style={{
            background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,.18) 50%,transparent 60%)",
            backgroundSize: "220% 100%", animation: "shimmer 2.8s linear infinite",
          }} />
        </span>
        <span className="relative flex items-center gap-1.5">
          <span className={busy ? "inline-block animate-spin" : ""}>💜</span>
          ON-CHAIN BLAST · {label}
        </span>
      </button>
      {lastHash && !busy && (
        <a
          href={`${MONAD.explorer}/tx/${lastHash}`}
          target="_blank" rel="noopener noreferrer"
          className="text-[9px] tracking-wide text-purple-300/70 hover:text-purple-200"
        >
          ✓ {lastHash.slice(0, 8)}…{lastHash.slice(-6)} · View ↗
        </a>
      )}
    </div>
  );
}
