"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { renderGame, createCamera, updateCamera, type Camera } from "@/lib/game-renderer";
import { createGameState, type GameState, type PlayerState, createPlayer } from "@/lib/game-engine";
import { CHARACTERS } from "@/lib/game-config";
import { audio } from "@/lib/audio";
import SpermPreview from "@/components/sperm-preview";
import type { MultiplayerApi } from "@/lib/use-multiplayer";
import type { SerializedGameState } from "@/lib/socket-client";
import { MpStatusBadge } from "@/components/mp-status-badge";

/**
 * Renders the server-authoritative match. We reuse the existing renderer by
 * mapping each serialized snapshot onto a client GameState (interpolated for
 * smooth motion). Input is sent to the server; the server owns the simulation.
 */
export default function MultiplayerMatch({ mp }: { mp: MultiplayerApi }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState());
  const cameraRef = useRef<Camera>(createCamera());
  const latestRef = useRef<SerializedGameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);
  const [countdown, setCountdown] = useState(3);
  const [live, setLive] = useState(false);

  // keep latest snapshot
  useEffect(() => { latestRef.current = mp.gameState; }, [mp.gameState]);

  // countdown then go
  useEffect(() => {
    audio.setScene("arena");
    // Kicks off the timed countdown sequence on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(3); audio.play("countdown");
    const t1 = setTimeout(() => { setCountdown(2); audio.play("countdown"); }, 900);
    const t2 = setTimeout(() => { setCountdown(1); audio.play("countdown"); }, 1800);
    const t3 = setTimeout(() => { setCountdown(0); setLive(true); audio.play("go"); }, 2700);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, []);

  // keyboard -> server
  useEffect(() => {
    const KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "1", "2", "3", "4", "5", "6", "m", "q", "e"];
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current.add(k);
      if (KEYS.includes(k)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // input sender (throttled ~20/s)
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => {
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      mp.sendInput({
        dx, dy,
        dash: keys.has(" "),
        ability: keys.has("1") || keys.has("2") || keys.has("3") || keys.has("4") || keys.has("5") || keys.has("6"),
        monadBlast: keys.has("m"),
        suck: keys.has("q"),
        blast: keys.has("e"),
      });
    }, 50);
    return () => clearInterval(iv);
  }, [live, mp]);

  // apply snapshot -> local GameState with interpolation
  const applySnapshot = useCallback((snap: SerializedGameState) => {
    const st = stateRef.current;
    st.timeRemaining = snap.timeRemaining;
    st.eventAnnouncement = snap.eventAnnouncement;
    // players
    const seen = new Set<string>();
    for (const sp of snap.players) {
      seen.add(sp.id);
      let p = st.players.get(sp.id) as PlayerState | undefined;
      if (!p) { p = createPlayer(sp.id, sp.name, sp.characterId, sp.isAI); st.players.set(sp.id, p); }
      // interpolate position for smoothness
      p.pos.x += (sp.x - p.pos.x) * 0.4;
      p.pos.y += (sp.y - p.pos.y) * 0.4;
      p.vel.x = sp.vx; p.vel.y = sp.vy;
      p.facing = sp.facing;
      p.health = sp.health; p.maxHealth = sp.maxHealth;
      p.energy = sp.energy; p.mon = sp.mon;
      p.alive = sp.alive; p.radius = sp.radius;
      p.name = sp.name; p.characterId = sp.characterId;
    }
    for (const id of Array.from(st.players.keys())) if (!seen.has(id)) st.players.delete(id);
    // crystals
    st.monCrystals = snap.monCrystals.map((c) => ({
      id: c.id, pos: { x: c.x, y: c.y }, value: c.value, radius: c.radius, pulsePhase: 0,
    }));
  }, []);

  // render loop
  useEffect(() => {
    const loop = (ts: number) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const parent = canvas.parentElement;
        if (parent) {
          const w = parent.clientWidth, h = parent.clientHeight;
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (latestRef.current) applySnapshot(latestRef.current);
          const me = stateRef.current.players.get(mp.playerId);
          if (me) updateCamera(cameraRef.current, me.pos);
          renderGame(ctx, canvas, stateRef.current, cameraRef.current, mp.playerId, ts);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applySnapshot, mp.playerId]);

  const winnerName = mp.winner
    ? (mp.players.find((p) => p.id === mp.winner)?.name ?? mp.gameState?.players.find((p) => p.id === mp.winner)?.name ?? "CHAMPION")
    : null;
  const winnerChar = mp.gameState?.players.find((p) => p.id === mp.winner)?.characterId ?? "space";

  return (
    <div className="fixed inset-0 bg-[#0a0014]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="absolute top-3 left-3 z-30"><MpStatusBadge conn={mp.conn} /></div>
      <button onClick={() => { audio.setScene("menu"); mp.leave(); }}
        className="absolute top-3 right-3 z-30 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 bg-black/50 text-purple-300 hover:bg-purple-500/20 transition">
        ✕ EXIT
      </button>

      {countdown > 0 && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/60">
          <div className="text-center">
            <p className="text-8xl font-black neon-text animate-bounce">{countdown}</p>
            <p className="text-lg text-purple-300 tracking-[0.4em] mt-2">
              {countdown === 3 ? "GET READY" : countdown === 2 ? "SET" : "SWIM!"}
            </p>
          </div>
        </div>
      )}

      {mp.winner && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-sm">
          <div className="text-center modal-pop">
            <div className="flex justify-center mb-1"><SpermPreview characterId={winnerChar} size={140} showcase boosting /></div>
            <div className="text-5xl mb-1 float-anim">🥚</div>
            <p className="text-lg tracking-[0.3em] text-purple-300 animate-pulse">THE EGG HAS CHOSEN</p>
            <p className="text-4xl font-black text-white title-glow">{winnerName}</p>
            <p className="text-base tracking-[0.35em] mt-1" style={{ color: "#ffd700" }}>MONAD CHAMPION</p>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <button onClick={() => { audio.setScene("menu"); mp.setScreen("room"); }} className="glow-btn glow-btn-pink px-7 py-3">🔁 REMATCH</button>
              <button onClick={() => { audio.setScene("menu"); mp.leave(); }} className="glow-btn px-7 py-3">🏠 LEAVE</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 right-2 z-10 text-[10px] text-purple-400/50 font-mono pointer-events-none">
        WASD Move · SPACE Dash · Q Suck · E Blast · 1-6 Ability · M MONAD BLAST
      </div>
    </div>
  );
}
