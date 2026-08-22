"use client";

import React from "react";
import Link from "next/link";
import MonadLogo from "./monad-logo";
import { useWallet } from "./wallet-provider";
import MonEnergy, { AnimatedBalance } from "./mon-energy";
import { sfx } from "@/lib/audio";
import { useMemes } from "@/lib/meme-engine";

/**
 * Polished top header used on the dashboard and play page.
 * Left: official Monad logo + SPERM WARS / MONAD EDITION
 * Center/right: nav, MON balance, wallet.
 */
export default function MonadHeader({ active }: { active?: "play" | "multiplayer" | "characters" | "leaderboard" | "profile" }) {
  const w = useWallet();
  const memes = useMemes();
  const items: Array<{ id: NonNullable<typeof active>; label: string; href: string; icon: string }> = [
    { id: "play", label: "PLAY", href: "/play", icon: "🎮" },
    { id: "multiplayer", label: "MULTIPLAYER", href: "/multiplayer", icon: "🧬" },
    { id: "characters", label: "CHARACTERS", href: "/characters", icon: "🤖" },
    { id: "leaderboard", label: "LEADERBOARD", href: "/leaderboard", icon: "🏆" },
  ];
  return (
    <header className="brand-header justify-between">
      <Link href="/dashboard" className="flex items-center gap-2.5 group" onMouseEnter={() => sfx("hover")}>
        <MonadLogo size={32} className="group-hover:scale-110 transition-transform" />
        <div>
          <p className="text-base font-black tracking-tight leading-none neon-text">SPERM WARS</p>
          <p className="text-[9px] tracking-[0.3em] text-purple-400/70 leading-none mt-0.5">MONAD EDITION</p>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {items.map((it) => {
          const isActive = active === it.id;
          return (
            <Link
              key={it.id}
              href={it.href}
              onMouseEnter={() => sfx("hover")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition ${
                isActive
                  ? "bg-purple-500/20 text-purple-100 border border-purple-500/40"
                  : "text-purple-300/70 hover:text-purple-100 hover:bg-purple-500/10"
              }`}
            >
              <span className="mr-1">{it.icon}</span>{it.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        {/* memes toggle */}
        <button
          onClick={() => { sfx("click"); memes.setEnabled(!memes.enabled); }}
          className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 transition"
          title="Toggle meme commentary"
        >
          {memes.enabled ? "💬" : "💭"}
        </button>

        {/* MON balance */}
        {w.isConnected && (
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
            style={{ background: "rgba(255,215,0,.08)", border: "1px solid rgba(255,215,0,.3)" }}>
            <span className="text-yellow-400 text-sm">💎</span>
            <span className="text-xs font-black text-yellow-300">
              <AnimatedBalance value={`${w.balance} MON`} />
            </span>
            <div className="hidden lg:block w-10 h-6 -my-1 -mr-1 rounded-md overflow-hidden">
              <MonEnergy size={40} density={10} hue={0} />
            </div>
          </div>
        )}

        {/* wallet pill */}
        <div className="hidden sm:flex items-center gap-1.5">
          {/* we re-use WalletButton from wallet-button for the connect pill */}
          {/* inline minimal trigger because the existing WalletButton opens the modal */}
          <button
            onClick={() => { sfx("click"); w.openModal(); }}
            className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg text-purple-200 transition hover:bg-purple-500/15"
            style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.3)" }}
          >
            {w.isConnected ? (w.shortAddress ?? "0x…") : "CONNECT"}
          </button>
        </div>
      </div>
    </header>
  );
}
