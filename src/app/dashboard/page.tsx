"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import SpermPreview from "@/components/sperm-preview";
import MonadCore from "@/components/monad-core";
import MonadHeader from "@/components/monad-header";
import MonEnergy, { AnimatedBalance } from "@/components/mon-energy";
import WalletButton from "@/components/wallet-button";
import MultiplayerHeroButton from "@/components/multiplayer-hero-button";
import { useMemes } from "@/lib/meme-engine";
import { CHARACTERS } from "@/lib/game-config";
import { loadProfile, ACHIEVEMENTS, achievementProgress, type PlayerProfile } from "@/lib/profile";
import { audio, sfx } from "@/lib/audio";

function DashboardContent() {
  const [tab, setTab] = useState("play");
  const [tick, setTick] = useState(0);
  const [p, setP] = useState<PlayerProfile | null>(null);
  const [muted, setMuted] = useState(false);
  const memes = useMemes();

  useEffect(() => {
    // localStorage is browser-only; must be read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setP(loadProfile());
    audio.init();
    audio.setScene("menu");
    const i = setInterval(() => setTick((t) => t + 1), 55);
    return () => clearInterval(i);
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.setMuted(m);
    if (!m) sfx("click");
  };

  const s = p?.stats;
  const winRate = s && s.arenaGames ? Math.round((s.arenaWins / s.arenaGames) * 100) : 0;

  const nav = [
    { id: "play", label: "PLAY", icon: "🎮" },
    { id: "multiplayer", label: "MULTIPLAYER", icon: "🧬", href: "/multiplayer" },
    { id: "characters", label: "CHARACTERS", icon: "🧬", href: "/characters" },
    { id: "leaderboard", label: "LEADERBOARD", icon: "🏆", href: "/leaderboard" },
    { id: "missions", label: "MISSIONS", icon: "⭐" },
    { id: "profile", label: "PROFILE", icon: "👤", href: "/profile" },
    { id: "howto", label: "HOW TO PLAY", icon: "📖", href: "/how-to-play" },
  ];

  return (
    <div className="min-h-screen animated-bg flex page-fade">
      {/* ambient particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              left: `${(i * 37 + tick * 0.012) % 100}%`,
              top: `${(i * 53 + tick * 0.009) % 100}%`,
              width: 2 + Math.sin(i) * 1.6,
              height: 2 + Math.sin(i) * 1.6,
              background: `rgba(${i % 3 ? "139,92,246" : "255,79,163"},${0.1 + Math.sin(tick * 0.02 + i) * 0.08})`,
            }} />
        ))}
      </div>

      {/* NAV */}
      <nav className="w-52 p-4 flex flex-col gap-1 relative z-10 border-r border-purple-900/30 bg-black/25">
        <Link href="/" className="mb-6 px-2 block group">
          <h1 className="text-xl font-black neon-text tracking-wider leading-none">SPERM</h1>
          <h1 className="text-xl font-black neon-text-pink tracking-wider leading-none">WARS</h1>
          <p className="text-[9px] text-purple-400/70 mt-1 tracking-[0.3em]">MONAD EDITION</p>
        </Link>

        {nav.map((n) => (
          n.href ? (
            <Link key={n.id} href={n.href} onMouseEnter={() => sfx("hover")}
              className="nav-item flex items-center gap-3 text-sm font-medium text-gray-400">
              <span className="text-lg">{n.icon}</span>{n.label}
            </Link>
          ) : (
            <button key={n.id} onClick={() => { sfx("click"); setTab(n.id); }}
              onMouseEnter={() => sfx("hover")}
              className={`nav-item flex items-center gap-3 text-sm font-medium text-left w-full ${
                tab === n.id ? "active" : "text-gray-400"}`}>
              <span className="text-lg">{n.icon}</span>{n.label}
            </button>
          )
        ))}

        <div className="mt-auto space-y-2">
          <button onClick={toggleMute}
            className="w-full text-[10px] py-2 rounded-lg border border-purple-500/25 text-purple-300/80 hover:bg-purple-500/10 transition">
            {muted ? "🔇 SOUND OFF" : "🔊 SOUND ON"}
          </button>
          <button onClick={() => { sfx("click"); memes.setEnabled(!memes.enabled); }}
            className="w-full text-[10px] py-2 rounded-lg border border-purple-500/25 text-purple-300/80 hover:bg-purple-500/10 transition">
            {memes.enabled ? "💬 MEMES ON" : "💬 MEMES OFF"}
          </button>
          <div className="flex justify-center"><WalletButton /></div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="flex-1 p-6 relative z-10 overflow-y-auto space-y-5">
        <MonadHeader active={tab as "play" | "multiplayer" | "characters" | "leaderboard" | "profile"} />

        {tab === "play" && (
          <div className="space-y-5">
            {/* HERO */}
            <div className="glass-card p-8 relative overflow-hidden min-h-[280px] flex items-center">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 320 + Math.sin(tick * 0.02) * 26,
                    height: 340 + Math.sin(tick * 0.02) * 26,
                    background: "radial-gradient(ellipse,rgba(255,140,220,.14),rgba(139,92,246,.05) 45%,transparent 68%)",
                    filter: "blur(26px)",
                  }} />
                {CHARACTERS.map((c, i) => {
                  const a = (i / CHARACTERS.length) * Math.PI * 2 + tick * 0.0055;
                  const rad = 170 + Math.sin(tick * 0.012 + i) * 18;
                  return (
                    <div key={c.id} className="absolute"
                      style={{
                        left: `calc(50% + ${Math.cos(a) * rad * 1.35}px - 34px)`,
                        top: `calc(50% + ${Math.sin(a) * rad * 0.6}px - 34px)`,
                        opacity: 0.55 + Math.sin(tick * 0.02 + i) * 0.3,
                      }}>
                      <SpermPreview characterId={c.id} size={68} />
                    </div>
                  );
                })}
              </div>

                <div className="relative z-10 w-full text-center">
                <div className="flex justify-center mb-3">
                  <MonadCore size={260} intensity={1} interactive />
                </div>
                <h2 className="text-3xl md:text-4xl font-black mb-1">
                  <span className="neon-text">THE ULTIMATE</span> <span className="neon-text-pink">BATTLE</span>
                </h2>
                <h3 className="text-xl font-bold text-purple-300 mb-2">TO FERTILIZE</h3>
                <p className="text-sm text-purple-200/50 italic mb-5">8 Sperm. 1 Egg. Infinite Chaos.</p>
                <div className="flex justify-center items-center gap-3">
                  <Link href="/play" onMouseEnter={() => sfx("hover")}
                    className="glow-btn glow-btn-pink text-base px-10 py-3.5 inline-block pulse-glow">
                    🎮 CHOOSE YOUR BATTLE
                  </Link>

                  <Link href="/nft" onMouseEnter={() => sfx("hover")}
                    className="glow-btn glow-btn-gold text-base px-10 py-3.5 inline-block pulse-glow">
                    🧬 MY NFTs
                  </Link>
                </div>
              </div>
            </div>

            {/* MULTIPLAYER HERO */}
            <MultiplayerHeroButton />

            {/* TWO GAMES */}
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { h: "/game", i: "🧬", t: "CHAOS ARENA", d: "Survive · Mutate · Sabotage", c: "#a855f7", tag: "8 PLAYERS" },
                { h: "/dash", i: "🥚", t: "SPERM DASH", d: "Swim · Dodge · Reach the Egg", c: "#ff4fa3", tag: "ENDLESS" },
              ].map((g) => (
                <Link key={g.h} href={g.h} onMouseEnter={() => sfx("hover")}
                  className="glass-card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform group"
                  style={{ borderColor: g.c + "3a" }}>
                  <div className="text-4xl group-hover:scale-110 transition-transform">{g.i}</div>
                  <div className="flex-1">
                    <p className="font-black text-base" style={{ color: g.c }}>{g.t}</p>
                    <p className="text-[11px] text-purple-300/60">{g.d}</p>
                  </div>
                  <span className="text-[8px] px-2 py-1 rounded-full font-bold tracking-widest"
                    style={{ background: g.c + "1c", border: `1px solid ${g.c}44`, color: g.c }}>{g.tag}</span>
                </Link>
              ))}
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "GAMES", v: s?.gamesPlayed ?? 0, c: "#e9d5ff" },
                { l: "ARENA WINS", v: s?.arenaWins ?? 0, c: "#ffd700" },
                { l: "DASH BEST", v: (s?.dashBestScore ?? 0).toLocaleString(), c: "#ff4fa3" },
                { l: "WIN RATE", v: `${winRate}%`, c: "#39ff14" },
              ].map((b) => (
                <div key={b.l} className="glass-card p-4 text-center">
                  <p className="text-2xl font-black" style={{ color: b.c }}>{b.v}</p>
                  <p className="text-[8px] tracking-widest text-purple-400/60 mt-0.5">{b.l}</p>
                </div>
              ))}
            </div>

            {/* MONAD */}
            <div className="glass-card p-4">
              <h3 className="text-[11px] font-black text-purple-400 mb-3 tracking-widest">✨ MONAD INTEGRATION</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { i: "💜", t: "Monad Blast", d: "Spend MON for a screen-shaking shockwave" },
                  { i: "⚡", t: "Parallel Events", d: "Everyone acts simultaneously" },
                  { i: "🏆", t: "On-Chain Results", d: "Winners recorded on Monad testnet" },
                  { i: "🧬", t: "Mutations", d: "Random abilities keep runs unique" },
                ].map((f) => (
                  <div key={f.t} className="flex items-start gap-2">
                    <span className="text-lg">{f.i}</span>
                    <div><p className="text-[11px] font-bold text-purple-200">{f.t}</p>
                    <p className="text-[9px] text-purple-400/60 leading-snug">{f.d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "missions" && p && (
          <div className="space-y-3">
            <h2 className="text-2xl font-black neon-text mb-1">MISSIONS</h2>
            <p className="text-xs text-purple-400/60 mb-4">Complete challenges across both game modes.</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((a) => {
                const done = p.unlocked.includes(a.id);
                const prog = achievementProgress(p, a);
                return (
                  <div key={a.id} className="glass-card p-3 flex items-center gap-3"
                    style={{ borderColor: done ? "rgba(255,215,0,.32)" : undefined }}>
                    <span className="text-2xl" style={{ filter: done ? "none" : "grayscale(1)", opacity: done ? 1 : .6 }}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: done ? "#ffd700" : "#c4b5fd" }}>
                        {a.name}{done && " ✓"}
                      </p>
                      <p className="text-[10px] text-purple-400/60">{a.desc}</p>
                      <div className="stat-bar mt-1.5">
                        <div className="stat-bar-fill" style={{ width: `${prog * 100}%`, background: done ? "#ffd700" : "#8b5cf6" }} />
                      </div>
                    </div>
                    <span className="text-[9px] text-purple-400/50">{Math.round(prog * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return <DashboardContent />;
}
