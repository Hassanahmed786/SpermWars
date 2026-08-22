"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/components/wallet-provider";
import MultiplayerPortal from "@/components/multiplayer-portal";
import MultiplayerLobby from "@/components/multiplayer-lobby";
import MultiplayerMatch from "@/components/multiplayer-match";
import { MpStatusBadge } from "@/components/mp-status-badge";
import SpermPreview from "@/components/sperm-preview";
import { CATEGORIES, personasByCategory } from "@/data/roster";
import { getCharacterDef } from "@/lib/game-config";
import { useMultiplayer } from "@/lib/use-multiplayer";
import { setPlayerName, getPlayerName } from "@/lib/socket-client";
import { audio, sfx } from "@/lib/audio";
import { recordArenaMatch } from "@/lib/profile";

function MultiplayerInner() {
  const router = useRouter();
  const params = useSearchParams();
  const wallet = useWallet();
  const mp = useMultiplayer();

  const [entered, setEntered] = useState(false);          // portal transition done
  const [character, setCharacter] = useState("space");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const recordedRef = useRef(false);

  useEffect(() => { audio.init(); audio.setScene("menu"); }, []);
  // Persisted name lives in localStorage — browser only.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setName(getPlayerName()); }, []);

  // portal open animation (~1.4s), then reveal hub
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // deep-link ?room=CODE → auto join once connected
  const autoJoined = useRef(false);
  useEffect(() => {
    const room = params.get("room");
    if (room && entered && mp.conn === "connected" && !autoJoined.current) {
      autoJoined.current = true;
      mp.joinRoom(room, character, wallet.isConnected ? wallet.address : null);
    }
  }, [params, entered, mp, character, wallet]);

  // record result once when a winner appears in a match
  useEffect(() => {
    if (mp.screen === "match" && mp.winner && !recordedRef.current) {
      recordedRef.current = true;
      const won = mp.winner === mp.playerId;
      const me = mp.gameState?.players.find((p) => p.id === mp.playerId);
      recordArenaMatch({ won, kills: 0, mon: me?.mon ?? 0 });
      void fetch("/api/scores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "arena", won, mon: me?.mon ?? 0, kills: 0, username: mp.playerName, wallet: wallet.address }),
      }).catch(() => {});
    }
    if (mp.screen !== "match") recordedRef.current = false;
  }, [mp.screen, mp.winner, mp.gameState, mp.playerId, mp.playerName, wallet.address]);

  // error toast
  useEffect(() => {
    if (mp.error) { sfx("hit"); const t = setTimeout(() => mp.clearError(), 3000); return () => clearTimeout(t); }
  }, [mp]);

  /* ── MATCH ── */
  if (mp.screen === "match") return <MultiplayerMatch mp={mp} />;

  const walletAddr = wallet.isConnected && !wallet.isDemoMode ? wallet.address : null;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MultiplayerPortal variant={entered ? "backdrop" : "transition"} />

      {/* portal entering overlay */}
      {!entered && (
        <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl md:text-5xl font-black neon-text tracking-wider">ENTER THE MONAD ARENA</p>
            <p className="text-purple-200/70 mt-2 text-sm tracking-wide italic">
              Find your opponents. Choose your sperm. Let the chaos begin.
            </p>
          </div>
        </div>
      )}

      {entered && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center p-4 page-fade">
            {/* top bar */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-6">
              <button onClick={() => { sfx("click"); router.push("/dashboard"); }}
                className="text-xs text-purple-300/70 hover:text-purple-200 tracking-widest">← DASHBOARD</button>
              <div className="flex items-center gap-3">
                <MpStatusBadge conn={mp.conn} />
                {mp.online !== null && (
                  <span className="text-[11px] text-green-300 font-bold">🟢 {mp.online} ONLINE</span>
                )}
              </div>
            </div>

            {/* server unreachable notice (honest, not fake) */}
            {mp.conn === "unavailable" && mp.screen === "hub" && (
              <div className="w-full max-w-lg mb-4 rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,176,32,.08)", border: "1px solid rgba(255,176,32,.3)" }}>
                <p className="text-xs text-yellow-300 font-bold">⚠ Multiplayer server not reachable</p>
                <p className="text-[10px] text-yellow-500/70 mt-1">
                  Run <code className="font-mono">npx tsx server.ts</code> to enable online play, or try Chaos Arena vs AI.
                </p>
                <button onClick={() => { sfx("click"); router.push("/game"); }}
                  className="glow-btn text-[11px] py-2 px-4 mt-2">🧬 PLAY VS AI</button>
              </div>
            )}

            {/* ── HUB ── */}
            {mp.screen === "hub" && (
              <div className="w-full max-w-3xl">
                <div className="text-center mb-6">
                  <h1 className="text-4xl md:text-5xl font-black neon-text tracking-tight">MULTIPLAYER HUB</h1>
                  <p className="text-purple-200/60 text-sm mt-1">Pick your sperm, then jump in.</p>
                </div>

                {/* identity row */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 justify-center">
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)" }}>
                    <SpermPreview characterId={character} size={44} />
                    <select value={character} onChange={(e) => { setCharacter(e.target.value); sfx("hover"); }}
                      className="bg-transparent text-sm font-bold text-purple-100 outline-none cursor-pointer">
                      {CATEGORIES.map((cat) => (
                        <optgroup key={cat} label={cat} className="bg-[#1a0630]">
                          {personasByCategory(cat).map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#1a0630]">{c.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setPlayerName(e.target.value); }}
                    placeholder="Your name"
                    maxLength={20}
                    className="rounded-xl px-3 py-2.5 text-sm text-purple-100 bg-transparent outline-none"
                    style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)" }}
                  />
                </div>

                {/* two big options */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={() => { sfx("go"); mp.quickMatch(character, walletAddr); }}
                    onMouseEnter={() => sfx("hover")}
                    disabled={mp.conn !== "connected"}
                    className="neon-card p-7 text-center group disabled:opacity-40"
                    style={{ borderColor: "rgba(255,215,0,.4)" }}>
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                    <p className="text-xl font-black text-yellow-300">QUICK MATCH</p>
                    <p className="text-[11px] text-purple-200/60 mt-1">Find players automatically</p>
                  </button>

                  <button
                    onClick={() => { sfx("click"); mp.createRoom(character, walletAddr); }}
                    onMouseEnter={() => sfx("hover")}
                    disabled={mp.conn !== "connected"}
                    className="neon-card p-7 text-center group disabled:opacity-40"
                    style={{ borderColor: "rgba(168,85,247,.5)" }}>
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🧬</div>
                    <p className="text-xl font-black" style={{ color: "#c4b5fd" }}>CREATE ROOM</p>
                    <p className="text-[11px] text-purple-200/60 mt-1">Invite your friends</p>
                  </button>
                </div>

                {/* join */}
                <div className="neon-card p-4 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                    placeholder="ENTER ROOM CODE"
                    className="flex-1 w-full rounded-xl px-4 py-3 text-center text-lg font-black font-mono tracking-[0.3em] text-white bg-transparent outline-none"
                    style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.3)" }}
                  />
                  <button
                    onClick={() => { sfx("click"); if (joinCode.length >= 4) mp.joinRoom(joinCode, character, walletAddr); }}
                    disabled={joinCode.length < 4 || mp.conn !== "connected"}
                    className="glow-btn glow-btn-pink px-8 py-3 text-sm w-full sm:w-auto disabled:opacity-40">
                    JOIN
                  </button>
                </div>

                <p className="text-center text-[10px] text-purple-400/50 mt-4">
                  Online matches are free — no MON required. MON only powers the optional on-chain Blast.
                </p>
              </div>
            )}

            {/* ── MATCHMAKING ── */}
            {mp.screen === "matchmaking" && (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <SpermPreview characterId={character} size={160} showcase boosting />
                </div>
                <p className="text-2xl font-black neon-text tracking-wide animate-pulse">{mp.matchmakingText}</p>
                <div className="w-56 h-1 bg-purple-900/40 rounded-full mx-auto mt-4 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full shimmer" style={{ width: "70%" }} />
                </div>
                <button onClick={() => { sfx("click"); mp.cancelQuickMatch(); }}
                  className="mt-6 text-xs text-purple-300/70 hover:text-purple-200 tracking-widest">✕ CANCEL</button>
              </div>
            )}

            {/* ── MATCH FOUND ── */}
            {mp.screen === "found" && (
              <div className="text-center modal-pop">
                <p className="text-4xl font-black text-green-400 title-glow mb-4">MATCH FOUND!</p>
                <div className="flex justify-center gap-2 flex-wrap max-w-lg">
                  {mp.players.map((p) => (
                    <div key={p.id} className="text-center">
                      <SpermPreview characterId={p.characterId} size={72} boosting />
                      <p className="text-[10px] font-bold" style={{ color: getCharacterDef(p.characterId).color }}>{p.name}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-purple-200/70 mt-4 tracking-widest animate-pulse">PREPARING THE ARENA…</p>
              </div>
            )}

            {/* ── ROOM LOBBY ── */}
            {mp.screen === "room" && (
              <MultiplayerLobby mp={mp} character={character} onPlay={() => {}} />
            )}

            {/* error banner */}
            {mp.error && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-sm font-bold text-red-200"
                style={{ background: "rgba(40,4,12,.95)", border: "1px solid rgba(255,64,96,.5)" }}>
                ⚠ {mp.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#0a0014] grid place-items-center text-purple-300 animate-pulse">Loading multiplayer…</div>}>
        <MultiplayerInner />
      </Suspense>
  );
}
