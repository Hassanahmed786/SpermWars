"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  createDashState, updateDash, dashRestart,
  type DashState, type DashInput, type DashEvents,
} from "@/lib/dash-engine";
import { renderDash } from "@/lib/dash-renderer";
import { audio } from "@/lib/audio";
import { CHARACTERS, getCharacterDef } from "@/lib/game-config";

interface Props {
  characterId: string;
  onExit: () => void;
  onRunComplete?: (r: { score: number; distance: number; mon: number; won: boolean; bestCombo: number }) => void;
}

const BEST_KEY = "spermwars.dash.best";

export default function DashCanvas({ characterId, onExit, onRunComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DashState>(createDashState());
  const inputRef = useRef<DashInput>({ up: false, down: false, boost: false, upPressed: false });
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const reportedRef = useRef(false);

  const [phase, setPhase] = useState<DashState["phase"]>("ready");
  const [best, setBest] = useState({ score: 0, distance: 0 });
  const [result, setResult] = useState<{ score: number; distance: number; mon: number; won: boolean; combo: number } | null>(null);

  const char = getCharacterDef(characterId);

  /* load best */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      // localStorage is browser-only; must be read post-mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setBest(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const finish = useCallback((won: boolean) => {
    const s = stateRef.current;
    if (reportedRef.current) return;
    reportedRef.current = true;
    const r = {
      score: Math.floor(s.score), distance: Math.floor(s.distance),
      mon: s.mon, won, combo: s.bestCombo,
    };
    setResult(r);
    setBest((prev) => {
      const nb = { score: Math.max(prev.score, r.score), distance: Math.max(prev.distance, r.distance) };
      try { localStorage.setItem(BEST_KEY, JSON.stringify(nb)); } catch { /* ignore */ }
      return nb;
    });
    onRunComplete?.({ ...r, bestCombo: s.bestCombo });
    audio.setScene("menu");
    audio.play(won ? "victory" : "defeat");
  }, [onRunComplete]);

  const events: DashEvents = {
    onCoin: () => audio.play("coin"),
    onCombo: () => audio.play("combo"),
    onHit: () => audio.play("hit"),
    onPower: () => audio.play("powerup"),
    onBoss: (k) => { audio.play("warning"); if (k === "chase") audio.setScene("boss"); else if (k === "final") audio.setScene("egg"); },
    onDeath: () => { audio.play("explode"); finish(false); },
    onWin: () => finish(true),
  };
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; });

  const start = useCallback(() => {
    dashRestart(stateRef.current);
    reportedRef.current = false;
    setResult(null);
    setPhase("playing");
    audio.init();
    audio.setScene("dash");
    audio.play("go");
  }, []);

  /* ── keyboard ── */
  useEffect(() => {
    const KEYS_UP = ["Space", "ArrowUp", "KeyW"];
    const KEYS_DOWN = ["ArrowDown", "KeyS"];
    const down = (e: KeyboardEvent) => {
      if (KEYS_UP.includes(e.code)) {
        e.preventDefault();
        if (!inputRef.current.up) inputRef.current.upPressed = true;
        inputRef.current.up = true;
        if (stateRef.current.phase === "ready") start();
        else if (stateRef.current.phase === "dead") start();
      }
      if (KEYS_DOWN.includes(e.code)) { e.preventDefault(); inputRef.current.down = true; }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inputRef.current.boost = true;
      if (e.code === "Escape") onExit();
    };
    const up = (e: KeyboardEvent) => {
      if (KEYS_UP.includes(e.code)) inputRef.current.up = false;
      if (KEYS_DOWN.includes(e.code)) inputRef.current.down = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inputRef.current.boost = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [start, onExit]);

  /* ── pointer / touch ── */
  const pointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isLower = e.clientY - rect.top > rect.height * 0.72;
    if (isLower) { inputRef.current.down = true; return; }
    if (!inputRef.current.up) inputRef.current.upPressed = true;
    inputRef.current.up = true;
    if (stateRef.current.phase === "ready" || stateRef.current.phase === "dead") start();
  }, [start]);

  const pointerUp = useCallback(() => {
    inputRef.current.up = false;
    inputRef.current.down = false;
  }, []);

  /* ── game loop ── */
  useEffect(() => {
    const loop = (ts: number) => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const parent = canvas.parentElement;
      if (parent) {
        const w = parent.clientWidth, h = parent.clientHeight;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      const dt = lastRef.current ? ts - lastRef.current : 16;
      lastRef.current = ts;

      const s = stateRef.current;
      updateDash(s, dt, inputRef.current, eventsRef.current);
      inputRef.current.upPressed = false;

      if (s.phase !== phase) setPhase(s.phase);

      renderDash(ctx, canvas.width, canvas.height, s, characterId, ts, best);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [characterId, best, phase]);

  useEffect(() => () => { audio.setScene("menu"); }, []);

  return (
    <div className="relative w-full h-full bg-[#05010d] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        onPointerDown={pointerDown}
        onPointerUp={pointerUp}
        onPointerLeave={pointerUp}
      />

      {/* READY */}
      {phase === "ready" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-black/80 via-black/60 to-black/85 backdrop-blur-[2px]">
          <div className="text-center px-6 max-w-lg">
            <div className="text-6xl mb-3 animate-bounce">🥚</div>
            <h1 className="text-5xl font-black mb-1" style={{ color: "#e9d5ff", textShadow: "0 0 40px rgba(139,92,246,.8)" }}>
              SPERM DASH
            </h1>
            <p className="text-sm tracking-[0.4em] text-purple-400 mb-6">RACE TO THE EGG</p>

            <div className="grid grid-cols-3 gap-2 mb-6 text-[11px]">
              {[
                { k: "SPACE / CLICK", v: "Swim up" },
                { k: "S / ↓", v: "Dive down" },
                { k: "SHIFT", v: "Boost" },
              ].map((c) => (
                <div key={c.k} className="rounded-lg border border-purple-500/25 bg-purple-500/10 p-2">
                  <p className="font-bold text-purple-200">{c.k}</p>
                  <p className="text-purple-400/70">{c.v}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mb-6 text-xs text-purple-300/70">
              <span className="text-2xl">{char.emoji}</span>
              <span style={{ color: char.color }} className="font-bold">{char.name}</span>
              {best.score > 0 && <span className="text-purple-400/60">· BEST {best.score.toLocaleString()}</span>}
            </div>

            <button onClick={start} className="glow-btn glow-btn-pink text-lg px-12 py-4 pulse-glow">
              ▶ START SWIMMING
            </button>
            <p className="text-[10px] text-purple-500/40 mt-4 tracking-widest">OR PRESS SPACE</p>
          </div>
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center px-6 max-w-md w-full">
            <div className="text-6xl mb-3">{result.won ? "🥚" : "💀"}</div>
            <h2 className="text-3xl font-black mb-1" style={{ color: result.won ? "#ffd700" : "#ff6b8a" }}>
              {result.won ? "THE EGG HAS CHOSEN YOU" : "SWIM ENDED"}
            </h2>
            <p className="text-xs tracking-[0.3em] text-purple-400 mb-6">
              {result.won ? "MONAD CHAMPION" : "TRY AGAIN, LITTLE SWIMMER"}
            </p>

            <div className="glass-card p-4 grid grid-cols-2 gap-3 mb-5 text-left">
              {[
                { l: "DISTANCE", v: `${result.distance}m`, c: "#e9d5ff" },
                { l: "SCORE", v: result.score.toLocaleString(), c: "#fff" },
                { l: "MON COLLECTED", v: `${result.mon}`, c: "#ffd700" },
                { l: "BEST COMBO", v: `x${result.combo}`, c: "#ff7ad9" },
                { l: "BEST SCORE", v: best.score.toLocaleString(), c: "#c4b5fd" },
                { l: "BEST DISTANCE", v: `${best.distance}m`, c: "#c4b5fd" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-[9px] tracking-widest text-purple-400/60">{s.l}</p>
                  <p className="text-lg font-black" style={{ color: s.c }}>{s.v}</p>
                </div>
              ))}
            </div>

            {result.score >= best.score && result.score > 0 && (
              <p className="text-xs text-yellow-400 mb-4 animate-pulse">🏆 NEW PERSONAL BEST!</p>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={start} className="glow-btn glow-btn-pink px-7 py-3">🔄 PLAY AGAIN</button>
              <button onClick={onExit} className="glow-btn px-7 py-3">🏠 RETURN</button>
            </div>
          </div>
        </div>
      )}

      {/* mobile hint */}
      {phase === "playing" && (
        <div className="absolute bottom-2 left-2 z-10 text-[10px] text-purple-400/40 font-mono pointer-events-none md:hidden">
          TAP TOP = SWIM · TAP BOTTOM = DIVE
        </div>
      )}

      <button
        onClick={onExit}
        className="absolute top-3 right-3 z-30 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 bg-black/50 text-purple-300 hover:bg-purple-500/20 transition"
      >
        ESC ✕
      </button>
    </div>
  );
}
