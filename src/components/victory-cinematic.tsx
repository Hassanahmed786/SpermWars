"use client";

import React, { useEffect, useRef, useState } from "react";
import { drawSpermByCharacter } from "@/lib/sperm-art";
import { getPersona } from "@/data/roster";
import { getCharacterDef } from "@/lib/game-config";
import {
  pickCharacterMeme, RARITY_COLOR, RARITY_LABEL,
  type ContextFlag, type PickedMeme,
} from "@/data/character-memes";
import MonadLogo from "./monad-logo";
import { audio, sfx } from "@/lib/audio";

/**
 * VICTORY CINEMATIC
 *
 * A ~4s character-specific sequence that plays before the normal results.
 * The winning sperm swims toward the Monad Core, the Core ignites, the
 * character's meme line lands, then the title resolves.
 *
 * Purely presentational — it reads the already-computed result and never
 * influences scoring, rewards, or any gameplay state.
 */

export interface VictoryCinematicProps {
  characterId: string;
  playerName: string;
  /** context flags so the meme reacts to what actually happened */
  context?: ContextFlag[];
  /** called once the cinematic finishes */
  onComplete: () => void;
  /** allow the player to skip */
  skippable?: boolean;
}

/* beat timeline (ms) */
const T = {
  approach: 0,      // sperm swims toward the core
  ignite: 1500,     // core flares
  meme: 2200,       // meme line slams in
  title: 3200,      // CHAMPION title
  done: 4600,
};

export default function VictoryCinematic({
  characterId, playerName, context = [], onComplete, skippable = true,
}: VictoryCinematicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const firedRef = useRef<Record<string, boolean>>({});
  const doneRef = useRef(false);

  const [beat, setBeat] = useState(0);
  const persona = getPersona(characterId);
  const def = getCharacterDef(characterId);
  const color = def.color;

  // Pick the meme once, up front, so it stays stable across re-renders.
  const [meme] = useState<PickedMeme>(() =>
    pickCharacterMeme(characterId, "victory", context)
    ?? { text: "MONAD CHAMPION", rarity: "common", icon: "🏆" }
  );

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  useEffect(() => {
    audio.init();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    startRef.current = performance.now();

    const loop = (now: number) => {
      const t = now - startRef.current;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      const fire = (k: string, at: number, fn: () => void) => {
        if (t >= at && !firedRef.current[k]) { firedRef.current[k] = true; fn(); }
      };
      fire("ignite", T.ignite, () => sfx("powerup"));
      fire("meme", T.meme, () => sfx(meme.rarity === "legendary" ? "monadBlast" : "coin"));
      fire("title", T.title, () => sfx("victory"));
      fire("done", T.done, finish);

      const b = t < T.ignite ? 0 : t < T.meme ? 1 : t < T.title ? 2 : 3;
      setBeat((prev) => (prev === b ? prev : b));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* backdrop */
      const igniteK = Math.max(0, Math.min(1, (t - T.ignite) / 900));
      const bg = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      bg.addColorStop(0, `rgba(${40 + igniteK * 90},${10 + igniteK * 20},${70 + igniteK * 60},1)`);
      bg.addColorStop(0.5, "#0d0018");
      bg.addColorStop(1, "#030007");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const coreX = W / 2;
      const coreY = H * 0.4;

      /* core energy rings */
      for (let i = 0; i < 4; i++) {
        const rr = (70 + i * 55) * (1 + igniteK * 0.6) + Math.sin(t * 0.004 + i) * 8;
        ctx.beginPath();
        ctx.arc(coreX, coreY, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168,85,247,${(0.28 - i * 0.05) * (0.4 + igniteK)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      /* core glow */
      const cg = ctx.createRadialGradient(coreX, coreY, 4, coreX, coreY, 190 * (0.6 + igniteK));
      cg.addColorStop(0, `rgba(233,213,255,${0.6 + igniteK * 0.4})`);
      cg.addColorStop(0.35, `rgba(168,85,247,${0.35 + igniteK * 0.4})`);
      cg.addColorStop(1, "rgba(2,0,10,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(coreX, coreY, 190 * (0.6 + igniteK), 0, Math.PI * 2);
      ctx.fill();

      /* MON particles streaming into the core */
      for (let i = 0; i < 40; i++) {
        const life = ((t * 0.00045 + i / 40) % 1);
        const a = i * 2.3 + t * 0.0012;
        const r = (1 - life) * 340;
        ctx.beginPath();
        ctx.arc(coreX + Math.cos(a) * r, coreY + Math.sin(a) * r, (1 - life) * 3 + 0.6, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0
          ? `rgba(255,215,0,${life * 0.85})`
          : `rgba(196,181,253,${life * 0.6})`;
        ctx.fill();
      }

      /* the winner swims in from the left toward the core */
      const approachK = Math.min(1, t / T.ignite);
      const eased = 1 - Math.pow(1 - approachK, 3);
      const sx = W * 0.12 + (coreX - W * 0.12) * eased * 0.72;
      const sy = coreY + Math.sin(t * 0.004) * 16;
      const scale = 1 + eased * 0.9 + igniteK * 0.25;

      // rocket trail for boost-flavoured personas
      const trailing = persona?.signature === "boost" || persona?.baseId === "space";
      if (trailing) {
        for (let i = 1; i <= 10; i++) {
          ctx.beginPath();
          ctx.arc(sx - i * 16, sy + Math.sin(t * 0.004 - i * 0.3) * 6, Math.max(0, 12 - i) * scale * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,${140 + i * 8},60,${0.22 - i * 0.02})`;
          ctx.fill();
        }
      }

      // purple aura for the Monad flagship
      if (characterId === "monad_maxi") {
        for (let i = 0; i < 6; i++) {
          const a = t * 0.005 + (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(sx + Math.cos(a) * 52 * scale, sy + Math.sin(a) * 52 * scale, 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(131,110,249,${0.5 + Math.sin(t * 0.006 + i) * 0.35})`;
          ctx.fill();
        }
      }

      drawSpermByCharacter(ctx, characterId, {
        x: sx, y: sy, r: 26 * scale, angle: 0, time: now,
        color, expression: "happy", effort: 1,
        boosting: true, seed: 2.1,
      });

      /* flash on the meme beat */
      if (t > T.meme && t < T.meme + 260) {
        const k = 1 - (t - T.meme) / 260;
        ctx.fillStyle = `rgba(233,213,255,${k * 0.55})`;
        ctx.fillRect(0, 0, W, H);
      }

      /* vignette */
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.66)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const rarityColor = RARITY_COLOR[meme.rarity];

  return (
    <div className="fixed inset-0 z-[95] bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Monad mark badge */}
      <div className="absolute top-5 left-5 flex items-center gap-2 opacity-70">
        <MonadLogo size={20} />
        <span className="text-[9px] tracking-[0.3em] text-purple-300/60 font-mono">MONAD CORE</span>
      </div>

      {/* meme line */}
      <div
        className="absolute inset-x-0 flex flex-col items-center px-6 pointer-events-none"
        style={{ top: "62%" }}
      >
        <div
          className="transition-all duration-500 text-center"
          style={{
            opacity: beat >= 2 ? 1 : 0,
            transform: beat >= 2 ? "scale(1)" : "scale(1.35)",
            filter: beat >= 2 ? "blur(0)" : "blur(10px)",
          }}
        >
          {meme.rarity !== "common" && (
            <span
              className="inline-block text-[9px] font-black tracking-[0.25em] px-2 py-0.5 rounded mb-2"
              style={{ background: `${rarityColor}22`, border: `1px solid ${rarityColor}66`, color: rarityColor }}
            >
              {RARITY_LABEL[meme.rarity]} REACTION
            </span>
          )}
          <p
            className="font-black tracking-tight leading-tight"
            style={{
              fontSize: "clamp(1.4rem, 5vw, 3rem)",
              color: rarityColor,
              textShadow: `0 0 34px ${rarityColor}99, 0 0 70px ${rarityColor}44`,
            }}
          >
            {meme.icon} {meme.text}
          </p>
        </div>

        {/* champion title */}
        <div
          className="transition-all duration-600 text-center mt-6"
          style={{
            opacity: beat >= 3 ? 1 : 0,
            transform: beat >= 3 ? "translateY(0)" : "translateY(26px)",
          }}
        >
          <p className="text-xs tracking-[0.45em] text-purple-300/70">THE EGG HAS CHOSEN</p>
          <p
            className="font-black tracking-tight my-1"
            style={{ fontSize: "clamp(1.6rem, 6vw, 3.4rem)", color, textShadow: `0 0 40px ${color}88` }}
          >
            {def.name}
          </p>
          <p className="text-sm text-purple-200/70">{playerName}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <MonadLogo size={16} />
            <p className="text-xs tracking-[0.35em] font-black text-yellow-400">MONAD CHAMPION</p>
          </div>
        </div>
      </div>

      {skippable && (
        <button
          onClick={finish}
          className="absolute bottom-6 right-6 text-[10px] tracking-[0.25em] px-3 py-2 rounded-lg border border-purple-500/30 text-purple-300/70 hover:text-white hover:bg-purple-500/15 transition"
        >
          SKIP ›
        </button>
      )}
    </div>
  );
}
