"use client";

import React, { useMemo, useState } from "react";
import { getCharacterDef } from "@/lib/game-config";
import {
  PERSONAS, CATEGORIES, getPersona,
  type PersonaCategory, type Persona,
} from "@/data/roster";
import { pickCharacterMeme, RARITY_COLOR, RARITY_LABEL } from "@/data/character-memes";
import SpermPreview from "./sperm-preview";
import MonadLogo from "./monad-logo";
import { sfx } from "@/lib/audio";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  title: string;
  subtitle: string;
  confirmLabel: string;
}

const CATEGORY_META: Record<PersonaCategory, { icon: string; color: string }> = {
  POLITICS:   { icon: "🏛️", color: "#ff9933" },
  TECH:       { icon: "🚀", color: "#00d4ff" },
  BLOCKCHAIN: { icon: "🟣", color: "#836ef9" },
  INTERNET:   { icon: "🎬", color: "#ff4fa3" },
  CHAOS:      { icon: "🌀", color: "#ff1493" },
};

/** Shared character-selection screen — categorised parody roster + showcase. */
export default function CharacterSelect({
  selected, onSelect, onConfirm, onBack, title, subtitle, confirmLabel,
}: Props) {
  const [category, setCategory] = useState<PersonaCategory>(
    () => getPersona(selected)?.category ?? "TECH"
  );
  const [hovered, setHovered] = useState<string | null>(null);

  const persona = getPersona(selected) ?? PERSONAS[0];
  const def = getCharacterDef(selected);
  const roster = useMemo(
    () => PERSONAS.filter((p) => p.category === category),
    [category]
  );

  // A sample victory line so the player can preview the character's humour.
  const memePreview = useMemo(
    () => pickCharacterMeme(persona.id, "victory"),
    [persona.id]
  );

  // derived flavour stats (unchanged formula — gameplay values come from the base archetype)
  const power = Math.round((def.baseHealth / 130) * 100);
  const speed = Math.round((def.baseSpeed / 3.4) * 100);
  const luck = Math.round(((def.baseEnergy / 130) * 0.6 + (persona.baseId === "chaos" ? 0.4 : 0.12)) * 100);

  const catColor = CATEGORY_META[persona.category].color;

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 page-fade">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-black neon-text">{title}</h1>
          <p className="text-sm text-purple-400/80 mt-1">{subtitle}</p>
        </div>

        {/* ── category tabs ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const on = c === category;
            return (
              <button
                key={c}
                onMouseEnter={() => sfx("hover")}
                onClick={() => { sfx("click"); setCategory(c); }}
                className="px-3.5 py-2 rounded-xl text-[11px] font-black tracking-wider transition-all hover:-translate-y-0.5"
                style={{
                  background: on ? `${meta.color}22` : "rgba(139,92,246,.06)",
                  border: `1px solid ${on ? meta.color : "rgba(139,92,246,.18)"}`,
                  color: on ? meta.color : "#8b7fa8",
                  boxShadow: on ? `0 0 18px ${meta.color}44` : "none",
                }}
              >
                <span className="mr-1.5">{meta.icon}</span>{c}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5">
          {/* ── roster ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            {roster.map((c) => {
              const isSel = c.id === selected;
              const isHot = hovered === c.id;
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => { setHovered(c.id); sfx("hover"); }}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => { sfx("click"); onSelect(c.id); }}
                  className="relative glass-card p-3 text-center transition-all duration-200 hover:-translate-y-1 overflow-hidden"
                  style={{
                    borderColor: isSel ? c.color : undefined,
                    boxShadow: isSel
                      ? `0 0 28px ${c.color}55, inset 0 0 30px ${c.color}12`
                      : isHot ? `0 0 18px ${c.color}33` : undefined,
                  }}
                >
                  {/* hover background wash — character specific */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: isHot || isSel ? 1 : 0,
                      background: `radial-gradient(circle at 50% 30%, ${c.color}22, transparent 70%)`,
                    }}
                  />
                  <div className="relative flex justify-center">
                    {/* signature animation: hovering accelerates the tail / boosts */}
                    <SpermPreview
                      characterId={c.id}
                      size={100}
                      boosting={isSel || isHot}
                      showcase={isHot}
                    />
                  </div>
                  <p className="relative text-[11px] font-black tracking-wide leading-tight" style={{ color: c.color }}>
                    {c.name}
                  </p>
                  <p className="relative text-[9px] text-purple-400/60 mt-0.5 truncate">{c.role}</p>
                  {c.id === "monad_maxi" && (
                    <span className="absolute top-1.5 left-1.5 text-[8px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: "#836ef9", color: "#fff" }}>
                      FLAGSHIP
                    </span>
                  )}
                  {isSel && (
                    <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{ background: c.color, color: "#12061c" }}>
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── showcase ── */}
          <div className="glass-card p-5 flex flex-col" style={{ borderColor: `${catColor}55` }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] tracking-[0.3em] text-purple-400/60">CHARACTER SHOWCASE</p>
              {persona.id === "monad_maxi" && <MonadLogo size={16} />}
            </div>

            <div className="flex justify-center my-2">
              <SpermPreview characterId={persona.id} size={190} showcase boosting />
            </div>

            <h2 className="text-xl font-black text-center leading-tight" style={{ color: persona.color }}>
              {persona.name}
            </h2>
            <p className="text-[11px] text-purple-400/70 text-center">{persona.role}</p>

            {/* parody attribution — archetype, never a named individual */}
            <div className="mt-2 mb-3 rounded-lg px-2.5 py-1.5 text-center"
              style={{ background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.18)" }}>
              <p className="text-[8px] tracking-[0.25em] text-purple-400/50">PARODY OF</p>
              <p className="text-[10px] text-purple-200/80 leading-snug">{persona.parodyOf}</p>
            </div>

            <div className="space-y-2 mb-3">
              {[
                { l: "SPEED", v: speed, c: persona.color },
                { l: "POWER", v: power, c: "#39ff14" },
                { l: "LUCK",  v: luck,  c: "#ffd700" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="flex justify-between text-[10px] text-purple-300/70 mb-1">
                    <span className="tracking-widest">{s.l}</span><span>{s.v}</span>
                  </div>
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: `${s.v}%`, background: s.c, boxShadow: `0 0 8px ${s.c}` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-3 mb-2"
              style={{ background: `${persona.color}10`, border: `1px solid ${persona.color}30` }}>
              <p className="text-xs font-black mb-1" style={{ color: persona.color }}>
                ⚡ {def.abilityName}
              </p>
              <p className="text-[11px] text-purple-200/70 leading-relaxed">{def.description}</p>
            </div>

            <div className="rounded-xl p-2.5 mb-3"
              style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(139,92,246,.18)" }}>
              <p className="text-[8px] tracking-[0.25em] text-purple-400/50 mb-1">PERSONALITY</p>
              <p className="text-[11px] text-purple-200/75 leading-snug mb-2">{persona.personality}</p>
              {memePreview && (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-[8px] tracking-[0.25em] text-purple-400/50">VICTORY LINE</p>
                    <span className="text-[7px] font-black px-1 py-0.5 rounded"
                      style={{ background: `${RARITY_COLOR[memePreview.rarity]}22`, color: RARITY_COLOR[memePreview.rarity] }}>
                      {RARITY_LABEL[memePreview.rarity]}
                    </span>
                  </div>
                  <p className="text-[11px] italic" style={{ color: RARITY_COLOR[memePreview.rarity] }}>
                    {memePreview.icon} &ldquo;{memePreview.text}&rdquo;
                  </p>
                </>
              )}
            </div>

            <div className="mt-auto flex gap-2">
              <button onClick={() => { sfx("click"); onConfirm(); }}
                className="glow-btn glow-btn-pink flex-1 py-3 text-sm">
                {confirmLabel}
              </button>
              <button onClick={() => { sfx("click"); onBack(); }}
                className="glow-btn px-4 py-3 text-sm">←</button>
            </div>
          </div>
        </div>

        <p className="text-center text-[9px] text-purple-500/40 mt-4 max-w-2xl mx-auto leading-relaxed">
          All characters are original fictional parodies of broad public archetypes.
          No real person is depicted, named, or implied to endorse, sponsor or participate in this game.
        </p>
      </div>
    </div>
  );
}

export type { Persona };
