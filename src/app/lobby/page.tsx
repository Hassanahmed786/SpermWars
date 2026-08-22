"use client";

import React, { useState, useCallback } from "react";
import WalletButton from "@/components/wallet-button";
import { PERSONAS } from "@/data/roster";
import { getCharacterDef } from "@/lib/game-config";

function LobbyContent() {
  const [roomId, setRoomId] = useState<string>("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [selectedChar, setSelectedChar] = useState("space");
  const [players, setPlayers] = useState<Array<{ id: string; name: string; characterId: string; ready: boolean }>>([]);
  const [playerName] = useState(() => `Player_${Math.random().toString(36).slice(2, 6)}`);

  const createRoom = useCallback(() => {
    const id = Array.from({ length: 6 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
    setRoomId(id);
    setInRoom(true);
    setPlayers([{
      id: "local-player",
      name: playerName,
      characterId: selectedChar,
      ready: false,
    }]);
  }, [playerName, selectedChar]);

  const joinRoom = useCallback(() => {
    if (joinRoomId.length === 6) {
      setRoomId(joinRoomId);
      setInRoom(true);
      setPlayers([
        { id: "host", name: "Host_Player", characterId: "ai", ready: true },
        { id: "local-player", name: playerName, characterId: selectedChar, ready: false },
      ]);
    }
  }, [joinRoomId, playerName, selectedChar]);

  const readyUp = useCallback(() => {
    setPlayers((prev) => prev.map((p) => p.id === "local-player" ? { ...p, ready: true } : p));
  }, []);

  const startMatch = useCallback(() => {
    window.location.href = `/game?room=${roomId}`;
  }, [roomId]);

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 page-fade">
      <div className="absolute top-4 right-4"><WalletButton compact /></div>
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black neon-text mb-1">GAME LOBBY</h1>
          <p className="text-sm text-purple-400">Create or join a room to battle</p>
        </div>

        {!inRoom ? (
          <div className="space-y-4">
            {/* Create Room */}
            <div className="glass-card p-6 text-center">
              <h2 className="text-lg font-bold text-purple-300 mb-4">🏠 Create Room</h2>
              <div className="mb-4">
                <label className="text-xs text-gray-400 block mb-2">Select Character</label>
                <div className="flex gap-2 justify-center flex-wrap">
                  {PERSONAS.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedChar(char.id)}
                      className={`p-2 rounded-lg transition-all ${
                        selectedChar === char.id ? "ring-2 ring-purple-500 bg-purple-900/30" : "bg-purple-900/10"
                      }`}
                    >
                      <span className="text-2xl">{char.emoji}</span>
                      <p className="text-[8px] text-gray-400">{char.name.split(" ")[0]}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createRoom} className="glow-btn px-8 py-3">
                CREATE ROOM
              </button>
            </div>

            {/* Join Room */}
            <div className="glass-card p-6 text-center">
              <h2 className="text-lg font-bold text-purple-300 mb-4">🔗 Join Room</h2>
              <div className="flex gap-2 justify-center mb-4">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ROOM CODE"
                  className="bg-purple-900/20 border border-purple-800/50 rounded-lg px-4 py-2 text-center font-mono text-lg tracking-widest text-white placeholder:text-purple-700 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button onClick={joinRoom} disabled={joinRoomId.length !== 6} className="glow-btn px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                JOIN ROOM
              </button>
            </div>

            {/* Quick Play */}
            <div className="glass-card p-6 text-center">
              <h2 className="text-lg font-bold text-pink-400 mb-2">⚡ Quick Play</h2>
              <p className="text-xs text-gray-400 mb-4">Jump into a game with AI opponents</p>
              <button onClick={() => window.location.href = "/game"} className="glow-btn glow-btn-pink px-8 py-3">
                PLAY NOW (SOLO)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Room Info */}
            <div className="glass-card p-6 text-center">
              <p className="text-xs text-gray-400 mb-1">ROOM CODE</p>
              <p className="text-3xl font-mono font-black neon-text tracking-[0.3em]">{roomId}</p>
            </div>

            {/* Players List */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-purple-300 mb-3">Players ({players.length}/8)</h3>
              <div className="space-y-2">
                {players.map((p, i) => {
                  const charDef = getCharacterDef(p.characterId);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-purple-900/10">
                      <span className="text-lg font-bold text-purple-400">{i + 1}.</span>
                      <span className="text-2xl">{charDef?.emoji || "🧬"}</span>
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className={`text-xs font-bold ${p.ready ? "text-green-400" : "text-gray-500"}`}>
                        {p.ready ? "✅ READY" : "⏳ WAITING"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              {!players.find((p) => p.id === "local-player")?.ready ? (
                <button onClick={readyUp} className="glow-btn glow-btn-gold px-8 py-3">
                  ✅ READY UP
                </button>
              ) : (
                <button onClick={startMatch} className="glow-btn glow-btn-pink px-8 py-3">
                  🎮 START MATCH
                </button>
              )}
              <button onClick={() => setInRoom(false)} className="glow-btn px-6 py-3 bg-gray-700 hover:bg-gray-600">
                LEAVE
              </button>
            </div>
          </div>
        )}

        <button onClick={() => window.location.href = "/play"} className="block text-center text-sm text-purple-400 hover:text-purple-300 transition-colors">
          ← Back to Game Select
        </button>
      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <LobbyContent />
  );
}
