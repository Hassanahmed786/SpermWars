"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CHARACTERS, getCharacterDef } from "@/lib/game-config";
import { PERSONAS } from "@/data/roster";
import SpermPreview from "@/components/sperm-preview";
import { sfx } from "@/lib/audio";

/** Keyboard key chip. Module scope so it is a stable component type. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono"
      style={{ background: "rgba(139,92,246,.18)", border: "1px solid rgba(167,139,250,.4)", color: "#e9d5ff" }}>
      {children}
    </kbd>
  );
}

export default function HowToPlayPage() {
  const [tab, setTab] = useState<"arena" | "dash" | "chars">("arena");

  return (
    <div className="min-h-screen animated-bg p-5">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black neon-text">HOW TO PLAY</h1>
            <p className="text-xs text-purple-400/70 tracking-widest">TWO GAMES · ONE EGG</p>
          </div>
          <Link href="/play" className="text-xs text-purple-400/70 hover:text-purple-300 tracking-widest">← BACK</Link>
        </div>

        <div className="flex gap-2">
          {([
            { k: "arena" as const, l: "🧬 CHAOS ARENA", c: "#a855f7" },
            { k: "dash" as const, l: "🥚 SPERM DASH", c: "#ff4fa3" },
            { k: "chars" as const, l: "👾 CHARACTERS", c: "#ffd700" },
          ]).map((t) => (
            <button key={t.k} onClick={() => { sfx("click"); setTab(t.k); }} onMouseEnter={() => sfx("hover")}
              className="flex-1 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all"
              style={{
                background: tab === t.k ? `${t.c}22` : "rgba(139,92,246,.06)",
                border: `1px solid ${tab === t.k ? t.c : "rgba(139,92,246,.18)"}`,
                color: tab === t.k ? t.c : "#8b7fa8",
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === "arena" && (
          <div className="glass-card p-6 space-y-5">
            <section>
              <h2 className="text-lg font-black text-purple-300 mb-2">🎯 OBJECTIVE</h2>
              <p className="text-sm text-purple-100/70 leading-relaxed">
                Up to 8 sperm fight inside a microscopic warzone. Knock rivals into hazards, collect MON energy,
                trigger mutations and survive. <b className="text-purple-300">Be the last swimmer alive</b> — or in the
                final 20 seconds, reach the giant egg to win instantly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-purple-300 mb-2">⌨ CONTROLS</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { k: <><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></>, d: "Swim around the arena" },
                  { k: <Key>SPACE</Key>, d: "Dash — burst of speed, knocks rivals" },
                  { k: <Key>Q</Key>, d: "SUCK — purple vortex pulls players & MON in" },
                  { k: <Key>E</Key>, d: "BLAST — radial shockwave, big knockback" },
                  { k: <><Key>1</Key>–<Key>6</Key></>, d: "Your character's unique ability" },
                  { k: <Key>M</Key>, d: "MONAD BLAST — costs 10 MON, devastating" },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-2.5" style={{ background: "rgba(139,92,246,.07)" }}>
                    <div className="flex gap-1 mb-1">{c.k}</div>
                    <p className="text-[11px] text-purple-300/70">{c.d}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-purple-300 mb-2">⚠️ RANDOM EVENTS</h2>
              <div className="space-y-1.5">
                {[
                  ["🛡️", "Immune Attack", "Immune cells invade and hunt everyone"],
                  ["🌊", "Fluid Surge", "A current shoves every player sideways"],
                  ["🧬", "Mutation Storm", "All survivors gain a random mutation"],
                  ["💜", "Monad Surge", "MON crystals spawn everywhere"],
                  ["🔄", "Gravity Flip", "Movement physics invert"],
                ].map(([i, n, d]) => (
                  <div key={n} className="flex items-center gap-3 rounded-lg p-2" style={{ background: "rgba(139,92,246,.05)" }}>
                    <span className="text-lg">{i}</span>
                    <span className="text-xs font-bold text-purple-200 w-32">{n}</span>
                    <span className="text-[11px] text-purple-400/70">{d}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-purple-300 mb-2">⚡ MONAD PARALLEL EVENT</h2>
              <p className="text-sm text-purple-100/70 leading-relaxed">
                Every ~25 seconds all players are given the same choice at the same instant —
                <b className="text-purple-300"> BOOST / ATTACK / DEFEND / MUTATE</b>. Nobody goes first;
                every decision is resolved together in a single simultaneous step, exactly like
                Monad&apos;s parallel execution.
              </p>
            </section>
          </div>
        )}

        {tab === "dash" && (
          <div className="glass-card p-6 space-y-5">
            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">🎯 OBJECTIVE</h2>
              <p className="text-sm text-purple-100/70 leading-relaxed">
                An endless swim down the canal. You move forward automatically and constantly accelerate.
                Dodge everything, chain MON combos, and survive <b className="text-pink-300">3000 metres</b> to
                reach the egg.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">⌨ CONTROLS</h2>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { k: <><Key>SPACE</Key> / <Key>CLICK</Key></>, d: "Swim upward" },
                  { k: <><Key>S</Key> / <Key>↓</Key></>, d: "Dive downward" },
                  { k: <Key>SHIFT</Key>, d: "Boost forward" },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-2.5" style={{ background: "rgba(255,79,163,.08)" }}>
                    <div className="flex gap-1 mb-1 flex-wrap">{c.k}</div>
                    <p className="text-[11px] text-purple-300/70">{c.d}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-purple-400/50 mt-2">
                On mobile: tap the upper screen to swim, the lower strip to dive.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">☠️ HAZARDS</h2>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ["🦠", "Immune cells", "Spiky drifting hunters"],
                  ["🧬", "DNA barriers", "Line up with the gap"],
                  ["🪨", "Cell fragments", "Solid debris"],
                  ["🌀", "Vortexes", "Drag you off course"],
                  ["⚡", "Electric fences", "Blink on and off — time it"],
                  ["🫧", "Bubble traps", "Not lethal, but they slow you"],
                  ["☠️", "Toxic zones", "Long deadly strips"],
                  ["🔴", "Moving cells", "Oscillate vertically"],
                ].map(([i, n, d]) => (
                  <div key={n} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "rgba(255,79,163,.05)" }}>
                    <span className="text-base">{i}</span>
                    <div><p className="text-[11px] font-bold text-purple-200">{n}</p>
                    <p className="text-[9px] text-purple-400/60">{d}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">🎁 POWER-UPS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  ["⚡", "TURBO", "+55% speed"],
                  ["🛡️", "SHIELD", "Survive one hit"],
                  ["🧬", "MUTATION", "Random buff"],
                  ["🧲", "MAGNET", "Attracts MON"],
                  ["🚀", "ROCKET", "Massive speed"],
                ].map(([i, n, d]) => (
                  <div key={n} className="rounded-lg p-2 text-center" style={{ background: "rgba(255,79,163,.07)" }}>
                    <div className="text-lg">{i}</div>
                    <p className="text-[10px] font-bold text-purple-200">{n}</p>
                    <p className="text-[8px] text-purple-400/60">{d}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">👹 BOSS EVENTS</h2>
              <div className="space-y-1.5">
                {[
                  ["🦠", "IMMUNE CELL CHASE", "A giant cell hunts you — survive 10 seconds"],
                  ["🧬", "DNA TUNNEL", "A narrow shifting corridor of DNA walls"],
                  ["💜", "MONAD SURGE", "Everything accelerates, MON floods the canal"],
                  ["🥚", "THE FINAL SWIM", "The egg appears — the last stretch is brutal"],
                ].map(([i, n, d]) => (
                  <div key={n} className="flex items-center gap-3 rounded-lg p-2" style={{ background: "rgba(255,79,163,.05)" }}>
                    <span className="text-lg">{i}</span>
                    <span className="text-[11px] font-bold text-purple-200 w-44">{n}</span>
                    <span className="text-[10px] text-purple-400/70">{d}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-black text-pink-400 mb-2">🔥 COMBOS</h2>
              <p className="text-sm text-purple-100/70 leading-relaxed">
                Collect MON crystals back-to-back to build a combo. Each crystal boosts your score multiplier,
                and every 10th crystal triggers a bonus burst. Miss for 2.2 seconds and the chain resets.
              </p>
            </section>
          </div>
        )}

        {tab === "chars" && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-black text-yellow-400 mb-4">👾 THE ROSTER</h2>
            <div className="space-y-3">
              {PERSONAS.map((c) => {
                const def = getCharacterDef(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl p-2"
                    style={{ background: c.color + "0d", border: `1px solid ${c.color}22` }}>
                    <SpermPreview characterId={c.id} size={86} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm" style={{ color: c.color }}>{c.name}</p>
                      <p className="text-[10px] text-purple-400/60">{c.category} · {c.role}</p>
                      <p className="text-[9px] text-purple-500/50 mb-1 italic">parody of: {c.parodyOf}</p>
                      <p className="text-[11px] text-purple-200/70 leading-snug">{c.tagline}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black" style={{ color: c.color }}>{def.abilityName}</p>
                      <p className="text-[9px] text-purple-500/60">KEY [{def.abilityKey}]</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/game" className="glow-btn px-6 py-2.5 text-xs">🧬 PLAY ARENA</Link>
          <Link href="/dash" className="glow-btn glow-btn-pink px-6 py-2.5 text-xs">🥚 PLAY DASH</Link>
        </div>
      </div>
    </div>
  );
}
