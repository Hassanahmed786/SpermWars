"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/wallet-provider";
import SpermPreview from "@/components/sperm-preview";
import MonadHeader from "@/components/monad-header";
import { CHARACTERS, getCharacterDef } from "@/lib/game-config";
import {
  loadProfile, ACHIEVEMENTS, achievementProgress, type PlayerProfile,
} from "@/lib/profile";

function ProfileContent() {
  const wallet = useWallet();
  const [p, setP] = useState<PlayerProfile | null>(null);

  // localStorage is browser-only; must be read post-mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setP(loadProfile()); }, []);

  if (!p) return <div className="min-h-screen animated-bg" />;

  const char = getCharacterDef(p.character);
  const s = p.stats;
  const winRate = s.arenaGames ? Math.round((s.arenaWins / s.arenaGames) * 100) : 0;

  const bigStats = [
    { l: "GAMES PLAYED", v: s.gamesPlayed, c: "#e9d5ff" },
    { l: "ARENA WINS", v: s.arenaWins, c: "#ffd700" },
    { l: "ARENA KILLS", v: s.arenaKills, c: "#ff6b8a" },
    { l: "WIN RATE", v: `${winRate}%`, c: "#39ff14" },
    { l: "DASH BEST SCORE", v: s.dashBestScore.toLocaleString(), c: "#ff4fa3" },
    { l: "DASH BEST DIST", v: `${s.dashBestDistance}m`, c: "#7ae0ff" },
    { l: "MON EARNED", v: s.monEarned, c: "#ffd700" },
    { l: "BEST STREAK", v: s.bestStreak, c: "#c77dff" },
  ];

  return (
    <div className="min-h-screen animated-bg p-5 page-fade">
      <div className="max-w-5xl mx-auto space-y-5">
        <MonadHeader active="profile" />
        <div>
          <h1 className="text-3xl font-black neon-text">PROFILE</h1>
          <p className="text-xs text-purple-400/70 tracking-widest">YOUR SWIMMING CAREER</p>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          {/* identity card */}
          <div className="glass-card p-5 text-center" style={{ borderColor: char.color + "44" }}>
            <div className="flex justify-center">
              <SpermPreview characterId={char.id} size={160} showcase />
            </div>
            <h2 className="text-lg font-black" style={{ color: char.color }}>{char.name}</h2>
            <p className="text-[10px] text-purple-400/60 mb-3">SELECTED SPERM</p>

            <div className="rounded-xl p-3 text-left" style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)" }}>
              <p className="text-[9px] tracking-widest text-purple-400/60 mb-1">WALLET</p>
              {wallet.isConnected ? (
                <>
                  <p className="text-xs font-mono text-purple-200 break-all">{wallet.shortAddress}</p>
                  <p className="text-xs text-yellow-400 mt-1">💎 {wallet.balance} MON</p>
                  {!wallet.isDemoMode && (
                    <p className="text-[9px] mt-1"
                      style={{ color: wallet.onMonad ? "#7ef7a0" : "#ffc44d" }}>
                      {wallet.onMonad ? `● ${wallet.networkName}` : "⚠ Wrong network"}
                    </p>
                  )}
                  {wallet.isDemoMode && (
                    <p className="text-[9px] text-yellow-500/70 bg-yellow-500/10 rounded px-1.5 py-0.5 mt-2 inline-block">
                      DEMO MODE — no real transactions
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={wallet.copyAddress}
                      className="flex-1 text-[9px] py-1.5 rounded-lg transition hover:bg-purple-500/15"
                      style={{ border: "1px solid rgba(139,92,246,.25)", color: "#c4b5fd" }}>
                      📋 Copy
                    </button>
                    {!wallet.isDemoMode && (
                      <a href={wallet.addressExplorerUrl() ?? "#"} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-[9px] py-1.5 rounded-lg text-center transition hover:bg-purple-500/15"
                        style={{ border: "1px solid rgba(139,92,246,.25)", color: "#c4b5fd" }}>
                        🔍 Explorer
                      </a>
                    )}
                    {!wallet.isDemoMode && !wallet.onMonad && (
                      <button onClick={() => void wallet.switchNetwork()}
                        className="flex-1 text-[9px] py-1.5 rounded-lg font-bold"
                        style={{ background: "linear-gradient(135deg,#ffb020,#ff7a00)", color: "#1a0b26" }}>
                        ⚠ Switch
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={wallet.connect} className="glow-btn w-full text-[10px] py-2 mt-1">
                  CONNECT WALLET
                </button>
              )}
            </div>
          </div>

          {/* stats */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {bigStats.map((b) => (
                <div key={b.l} className="glass-card p-3 text-center">
                  <p className="text-xl font-black" style={{ color: b.c }}>{b.v}</p>
                  <p className="text-[8px] tracking-widest text-purple-400/60 mt-0.5">{b.l}</p>
                </div>
              ))}
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-purple-300 tracking-wide">🏅 ACHIEVEMENTS</h3>
                <span className="text-[10px] text-purple-400/60">
                  {p.unlocked.length} / {ACHIEVEMENTS.length} UNLOCKED
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const done = p.unlocked.includes(a.id);
                  const prog = achievementProgress(p, a);
                  return (
                    <div key={a.id}
                      className="flex items-center gap-3 rounded-xl p-2.5 transition"
                      style={{
                        background: done ? "rgba(255,215,0,.07)" : "rgba(139,92,246,.05)",
                        border: `1px solid ${done ? "rgba(255,215,0,.3)" : "rgba(139,92,246,.14)"}`,
                        opacity: done ? 1 : 0.72,
                      }}>
                      <span className="text-xl" style={{ filter: done ? "none" : "grayscale(1)" }}>{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold" style={{ color: done ? "#ffd700" : "#c4b5fd" }}>
                          {a.name}{done && " ✓"}
                        </p>
                        <p className="text-[9px] text-purple-400/60 truncate">{a.desc}</p>
                        <div className="stat-bar mt-1">
                          <div className="stat-bar-fill"
                            style={{ width: `${prog * 100}%`, background: done ? "#ffd700" : "#8b5cf6" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-purple-500/40 text-center">
          Personal progress is stored locally in your browser. Global rankings come from the game server.
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return <ProfileContent />;
}
