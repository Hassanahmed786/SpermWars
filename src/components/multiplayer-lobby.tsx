"use client";

import React, { useState, useEffect, useCallback } from "react";
import SpermPreview from "@/components/sperm-preview";
import { MpStatusBadge } from "@/components/mp-status-badge";
import { useWallet } from "@/components/wallet-provider";
import { CHARACTERS, MAX_PLAYERS, getCharacterDef } from "@/lib/game-config";
import type { MultiplayerApi } from "@/lib/use-multiplayer";
import { sfx } from "@/lib/audio";

const short = (w?: string | null) => (w ? `${w.slice(0, 5)}...${w.slice(-3)}` : null);

/** The animated room lobby (players as swimming sperm, ready states, host controls). */
export default function MultiplayerLobby({ mp, character, onPlay }: {
  mp: MultiplayerApi;
  character: string;
  onPlay: () => void;
}) {
  const wallet = useWallet();
  const [copied, setCopied] = useState(false);
  const [stakeAmount, setStakeAmount] = useState("0.1");
  const [staking, setStaking] = useState(false);
  const me = mp.players.find((p) => p.id === mp.playerId);
  const iAmReady = me?.ready ?? false;
  const connectedPlayers = mp.players.filter((p) => p.connected);
  const allReady = connectedPlayers.length >= 1 && connectedPlayers.every((p) => p.ready);

  // keep my character in sync with server when it changes in select
  useEffect(() => { if (mp.roomId) mp.selectCharacter(character); /* eslint-disable-next-line */ }, [character]);

  const roomLink = typeof window !== "undefined" && mp.roomId
    ? `${window.location.origin}/multiplayer?room=${mp.roomId}`
    : "";

  const copyCode = useCallback(() => {
    if (!mp.roomId) return;
    navigator.clipboard?.writeText(mp.roomId);
    setCopied(true); sfx("coin");
    setTimeout(() => setCopied(false), 1600);
  }, [mp.roomId]);

  const share = useCallback(async () => {
    sfx("click");
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    if (nav.share && roomLink) {
      try { await nav.share({ title: "Sperm Wars", text: `Join my arena! Code ${mp.roomId}`, url: roomLink }); return; } catch { /* fall through */ }
    }
    if (roomLink) { navigator.clipboard?.writeText(roomLink); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  }, [roomLink, mp.roomId]);

  const handleStake = useCallback(async () => {
    const amount = Number(stakeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      sfx("hit");
      return;
    }
    if (!mp.roomId) return;
    if (!wallet.isConnected) {
      wallet.openModal();
      return;
    }
    if (!wallet.onMonad) {
      await wallet.switchNetwork();
      if (!wallet.onMonad) {
        sfx("hit");
        return;
      }
    }
    setStaking(true);
    try {
      const { ok } = await wallet.stakeMon(mp.roomId, amount, "Match stake");
      if (!ok) {
        sfx("hit");
      } else {
        sfx("coin");
      }
    } finally {
      setStaking(false);
    }
  }, [mp.roomId, stakeAmount, wallet]);

  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => mp.players[i] ?? null);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] tracking-[0.35em] text-purple-400/60">MONAD ARENA LOBBY</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black neon-text tracking-wider font-mono">{mp.roomId}</h2>
            <MpStatusBadge conn={mp.conn} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyCode} onMouseEnter={() => sfx("hover")}
            className="glow-btn text-[11px] py-2 px-4">
            {copied ? "✓ COPIED" : "📋 COPY CODE"}
          </button>
          <button onClick={share} onMouseEnter={() => sfx("hover")}
            className="glow-btn text-[11px] py-2 px-4">📨 INVITE</button>
        </div>
      </div>

      {/* player count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-purple-200">
          PLAYERS <span className="text-yellow-400">{connectedPlayers.length} / {MAX_PLAYERS}</span>
        </span>
        {allReady && <span className="text-xs font-black text-green-400 animate-pulse">EVERYONE IS READY — THE EGG IS WAITING…</span>}
      </div>

      {/* slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {slots.map((p, i) => {
          if (!p) {
            return (
              <div key={i} className="rounded-2xl p-3 text-center slot-searching"
                style={{ border: "1px dashed rgba(139,92,246,.25)", minHeight: 150 }}>
                <div className="h-[92px] grid place-items-center">
                  <span className="text-2xl opacity-40 animate-pulse">🧬</span>
                </div>
                <p className="text-[10px] tracking-widest text-purple-400/50">SEARCHING…</p>
              </div>
            );
          }
          const cd = getCharacterDef(p.characterId);
          const isMe = p.id === mp.playerId;
          return (
            <div key={p.id}
              className={`rounded-2xl p-3 text-center transition-all ${p.ready ? "ready-aura" : ""}`}
              style={{
                border: `1px solid ${p.ready ? "rgba(57,255,20,.5)" : isMe ? cd.color : "rgba(139,92,246,.3)"}`,
                background: isMe ? `${cd.color}12` : "rgba(139,92,246,.06)",
                opacity: p.connected ? 1 : 0.5,
                minHeight: 150,
              }}>
              <div className="flex justify-center">
                <SpermPreview characterId={p.characterId} size={92} boosting={p.ready} />
              </div>
              <p className="text-[11px] font-black truncate" style={{ color: cd.color }}>
                {p.name}{isMe && " (you)"}
              </p>
              {short(p.wallet) && <p className="text-[8px] font-mono text-purple-400/60">{short(p.wallet)}</p>}
              <p className="text-[10px] font-bold mt-0.5"
                style={{ color: p.ready ? "#7ef7a0" : "#8b7fa8" }}>
                {!p.connected ? "RECONNECTING…" : p.ready ? "READY ✓" : "WAITING"}
                {p.isHost && " · HOST"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mb-5 rounded-2xl p-4"
        style={{ background: "rgba(168,85,247,.06)", border: "1px solid rgba(168,85,247,.28)" }}>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-purple-400/60">MATCH POT</p>
            <p className="text-sm font-bold text-purple-200">Stake MON for this room</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-28 rounded-xl px-3 py-2 text-sm text-white bg-transparent outline-none text-center"
              style={{ border: "1px solid rgba(139,92,246,.35)", background: "rgba(10,6,22,.35)" }}
              aria-label="Stake amount in MON"
            />
            <button
              onClick={handleStake}
              disabled={staking || !mp.roomId}
              className="glow-btn glow-btn-pink px-4 py-2.5 text-[11px] disabled:opacity-40"
            >
              {staking ? "STAKING…" : "STAKE MON"}
            </button>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => { sfx("click"); mp.toggleReady(!iAmReady); }}
          className={`glow-btn ${iAmReady ? "" : "glow-btn-gold"} px-8 py-3.5 text-sm`}
        >
          {iAmReady ? "✕ NOT READY" : "✓ READY UP"}
        </button>
        {mp.isHost && (
          <button
            onClick={() => { sfx("go"); mp.startGame(); }}
            disabled={!allReady}
            className="glow-btn glow-btn-pink px-8 py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 START GAME
          </button>
        )}
        <button onClick={() => { sfx("click"); mp.leave(); }}
          className="px-6 py-3.5 rounded-xl text-sm font-bold text-red-300 transition hover:bg-red-500/15"
          style={{ border: "1px solid rgba(255,64,96,.3)" }}>
          ← LEAVE
        </button>
      </div>

      {!mp.isHost && (
        <p className="text-center text-[10px] text-purple-400/50 mt-3">Waiting for the host to start…</p>
      )}
      <button onClick={onPlay} className="hidden" aria-hidden />
    </div>
  );
}
