"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import CharacterSelect from "@/components/character-select";
import WalletButton from "@/components/wallet-button";
import OnchainBlast from "@/components/onchain-blast";
import MemeCommentator from "@/components/meme-commentator";
import { ResultTicker, buildArenaResult } from "@/components/result-ticker";
import VictoryCinematic from "@/components/victory-cinematic";
import type { ContextFlag } from "@/data/character-memes";
import { useMemes } from "@/lib/meme-engine";
import { recordArenaMatch } from "@/lib/profile";
import { audio } from "@/lib/audio";

const GameCanvas = dynamic(() => import("@/components/game-canvas"), { ssr: false });

function ArenaPage() {
  const router = useRouter();
  const [character, setCharacter] = useState("space");
  const [playing, setPlaying] = useState(false);
  const [playerName] = useState(() => `You_${Math.random().toString(36).slice(2, 5).toUpperCase()}`);

  const memes = useMemes();
  const lastStatsRef = useRef<{ mon: number; kills: number; placement: number } | null>(null);
  const blastUsedRef = useRef(false);
  const [result, setResult] = useState<null | { won: boolean; mon: number; score: number }>(null);
  const [ctxFlags, setCtxFlags] = useState<ContextFlag[]>([]);
  const [cinematicDone, setCinematicDone] = useState(false);

  const start = useCallback(() => {
    audio.init();
    audio.setScene("arena");
    blastUsedRef.current = false;
    setResult(null);
    setCtxFlags([]);
    setCinematicDone(false);
    setPlaying(true);
  }, []);

  const handleEnd = useCallback(
    (winnerId: string, stats: { mon: number; kills: number; placement: number }) => {
      const won = winnerId === "local-player";
      lastStatsRef.current = stats;
      recordArenaMatch({ won, kills: stats.kills, mon: stats.mon });
      void fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "arena", won, ...stats }),
      }).catch(() => {});
      audio.setScene("menu");
      audio.play(won ? "victory" : "defeat");

      // Build context flags so the meme reacts to what actually happened.
      const flags: ContextFlag[] = [];
      if (stats.mon >= 200) flags.push("bigMon");
      if (stats.placement <= 2 && !won) flags.push("nearEgg");
      if (blastUsedRef.current) flags.push("usedBlast");
      if (stats.kills === 0 && won) flags.push("flawless");
      setCtxFlags(flags);

      if (won) memes.push(character, "win", flags);
      else if (stats.placement === 2) memes.push(character, "lose", flags);
      else memes.push(character, "die", flags);
      if (stats.mon >= 200) memes.push(character, "big_money", flags);

      setCinematicDone(!won); // only winners get the cinematic
      setResult({ won, mon: stats.mon, score: stats.kills * 100 + stats.mon * 10 });
    },
    [memes, character]
  );

  // Mid-game ambient memes for the commentary bubble (no engine changes)
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => memes.push(character, "boost"), 8000);
    return () => clearTimeout(t);
  }, [playing, character, memes]);

  // React to the Monad Blast event broadcast by GameCanvas
  useEffect(() => {
    if (!playing) return;
    const onBlast = () => { blastUsedRef.current = true; memes.push(character, "use_blast"); };
    window.addEventListener("spermwars:monadBlast", onBlast);
    return () => window.removeEventListener("spermwars:monadBlast", onBlast);
  }, [playing, character, memes]);

  if (playing) {
    return (
      <div className="fixed inset-0 bg-[#0a0014]">
        <GameCanvas
          localPlayerId="local-player"
          localPlayerName={playerName}
          characterId={character}
          onGameEnd={handleEnd}
        />
        <MemeCommentator isPlaying={playing} characterId={character} />
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <WalletButton compact />
          <button
            onClick={() => { audio.setScene("menu"); setPlaying(false); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 bg-black/50 text-purple-300 hover:bg-purple-500/20 transition"
          >
            ✕ EXIT
          </button>
        </div>
        <OnchainBlast />
        {result?.won && !cinematicDone && (
          <VictoryCinematic
            characterId={character}
            playerName={playerName}
            context={ctxFlags}
            onComplete={() => setCinematicDone(true)}
          />
        )}
        {result && cinematicDone && (
          <ResultTicker
            visible={true}
            mode="arena"
            data={buildArenaResult({
              characterId: character,
              winnerName: result.won ? playerName : playerName,
              mon: result.mon,
              score: result.score,
              context: ctxFlags,
            })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <CharacterSelect
        selected={character}
        onSelect={setCharacter}
        onConfirm={start}
        onBack={() => router.push("/play")}
        title="🧬 CHAOS ARENA"
        subtitle="Survive · Mutate · Sabotage · Fertilise"
        confirmLabel="⚔ ENTER THE ARENA"
      />
      <button
        onClick={() => router.push("/multiplayer")}
        className="fixed bottom-4 right-4 z-20 glow-btn glow-btn-pink text-xs py-2.5 px-5 pulse-glow"
      >
        🧬 PLAY ONLINE →
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <ArenaPage />
  );
}
