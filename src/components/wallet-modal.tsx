"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "./wallet-provider";
import { detectWallets, type WalletMeta, type WalletId } from "@/lib/wallet-core";
import { MONAD } from "@/lib/monad-chain";
import { sfx } from "@/lib/audio";

/**
 * CONNECT WALLET modal. Renders the real detection state for each wallet.
 * - installed injected wallets show [Installed] and connect directly
 * - non-installed EVM wallets show [Not detected] and link to install
 * - WalletConnect shows [Configure] unless a project id is set (honest)
 * - Demo mode is clearly separated and labelled
 */
export default function WalletModal() {
  const wallet = useWallet();
  const [metas, setMetas] = useState<WalletMeta[]>([]);
  const [busy, setBusy] = useState<WalletId | null>(null);

  useEffect(() => {
    if (!wallet.modalOpen) return;
    // detect on open (extensions may inject late)
    const run = () => setMetas(detectWallets());
    run();
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [wallet.modalOpen]);

  // esc to close
  useEffect(() => {
    if (!wallet.modalOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") wallet.closeModal(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [wallet.modalOpen, wallet]);

  if (!wallet.modalOpen) return null;

  const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  const installUrls: Record<string, string> = {
    metamask: "https://metamask.io/download/",
    phantom: "https://phantom.app/download",
    rainbow: "https://rainbow.me/",
    coinbase: "https://www.coinbase.com/wallet/downloads",
    trust: "https://trustwallet.com/download",
  };

  const handleConnect = async (m: WalletMeta) => {
    if (!m.installed) {
      window.open(installUrls[m.id] ?? "#", "_blank", "noopener,noreferrer");
      return;
    }
    setBusy(m.id);
    try { await wallet.connectWith(m.id); } catch { /* toast handled */ }
    finally { setBusy(null); }
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center p-4 modal-backdrop"
      onClick={wallet.closeModal}
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 modal-pop"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, rgba(24,8,44,.98), rgba(10,2,22,.98))",
          border: "1px solid rgba(139,92,246,.35)",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.9), 0 0 60px -20px rgba(139,92,246,.6)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-black text-white tracking-tight">Connect Wallet</h2>
          <button onClick={() => { sfx("click"); wallet.closeModal(); }}
            className="text-purple-300/60 hover:text-white transition text-sm p-1" aria-label="Close">✕</button>
        </div>
        <p className="text-[11px] text-purple-300/60 mb-4">
          Play on <span className="text-purple-200 font-bold">{MONAD.name}</span> · chain {MONAD.chainId}
        </p>

        <div className="space-y-2">
          {metas.map((m) => (
            <button
              key={m.id}
              onMouseEnter={() => sfx("hover")}
              onClick={() => { sfx("click"); void handleConnect(m); }}
              disabled={busy === m.id}
              className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all group text-left hover:-translate-y-0.5 disabled:opacity-60"
              style={{
                background: "rgba(139,92,246,.08)",
                border: `1px solid ${m.installed ? "rgba(139,92,246,.35)" : "rgba(139,92,246,.16)"}`,
              }}
            >
              <span className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0"
                style={{ background: "rgba(139,92,246,.14)", border: "1px solid rgba(139,92,246,.25)" }}>
                {m.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white">{m.name}</span>
                <span className="block text-[10px]"
                  style={{ color: m.installed ? "#7ef7a0" : "#8b7fa8" }}>
                  {busy === m.id ? "Connecting…" : m.installed ? "● Installed" : "Not detected — install"}
                </span>
              </span>
              <span className="text-purple-300/40 group-hover:translate-x-0.5 transition" aria-hidden>→</span>
            </button>
          ))}

          {/* WalletConnect — honest about configuration */}
          <button
            onMouseEnter={() => sfx("hover")}
            onClick={() => {
              sfx("click");
              if (!wcProjectId) {
                window.open("https://cloud.reown.com", "_blank", "noopener,noreferrer");
              }
            }}
            className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all text-left hover:-translate-y-0.5"
            style={{ background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.16)" }}
          >
            <span className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0"
              style={{ background: "rgba(59,130,246,.14)", border: "1px solid rgba(59,130,246,.3)" }}>🔗</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-white">WalletConnect</span>
              <span className="block text-[10px] text-purple-300/60">
                {wcProjectId ? "Scan QR with a mobile wallet" : "Requires project ID (Reown) — configure to enable"}
              </span>
            </span>
            <span className="text-purple-300/40" aria-hidden>{wcProjectId ? "QR" : "⚙"}</span>
          </button>
        </div>

        {/* Demo mode — clearly separated */}
        <div className="mt-4 pt-4 border-t border-purple-500/15">
          <button
            onMouseEnter={() => sfx("hover")}
            onClick={() => { sfx("click"); wallet.connectDemo(); }}
            className="w-full rounded-2xl p-3 text-left transition hover:-translate-y-0.5"
            style={{ background: "rgba(255,196,0,.06)", border: "1px solid rgba(255,196,0,.24)" }}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🎮</span>
              <span>
                <span className="block text-sm font-bold text-yellow-300">Continue in Demo Mode</span>
                <span className="block text-[10px] text-yellow-500/70">Explore the game — no real transactions</span>
              </span>
            </span>
          </button>
        </div>

        <p className="text-[9px] text-purple-500/40 text-center mt-4 leading-relaxed">
          We never ask for your seed phrase or private key. Transactions are signed in your own wallet.
        </p>
      </div>
    </div>
  );
}
