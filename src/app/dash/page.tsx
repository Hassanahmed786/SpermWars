"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import CharacterSelect from "@/components/character-select";
import MemeCommentator from "@/components/meme-commentator";
import { ResultTicker, buildDashResult } from "@/components/result-ticker";
import VictoryCinematic from "@/components/victory-cinematic";
import type { ContextFlag } from "@/data/character-memes";
import { useMemes } from "@/lib/meme-engine";
import { recordDashRun } from "@/lib/profile";

const DashCanvas = dynamic(() => import("@/components/dash-canvas"), { ssr: false });

function DashPage() {
  const router = useRouter();
  const memes = useMemes();
  const [character, setCharacter] = useState("space");
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<null | { mon: number; score: number; distance: number; combo: number; won: boolean; name: string }>(null);
  const [ctxFlags, setCtxFlags] = useState<ContextFlag[]>([]);
  const [cinematicDone, setCinematicDone] = useState(false);

  const handleRun = useCallback((r: { score: number; distance: number; mon: number; won: boolean; bestCombo: number }) => {
    recordDashRun(r);
    void fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dash", ...r }),
    }).catch(() => {});
    // Context flags so the reaction matches the run.
    const flags: ContextFlag[] = [];
    if (r.mon >= 80) flags.push("bigMon");
    if (!r.won && r.distance > 800) flags.push("nearEgg");
    if (r.bestCombo >= 15) flags.push("usedBoost");
    setCtxFlags(flags);

    if (r.won) memes.push(character, "win", flags);
    else if (r.distance > 800) memes.push(character, "die_near_egg", flags);
    else memes.push(character, "die_immediately", flags);
    if (r.mon >= 80) memes.push(character, "big_money", flags);

    setCinematicDone(!r.won);
    setResult({ mon: r.mon, score: r.score, distance: r.distance, combo: r.bestCombo, won: r.won, name: `DashSwimmer` });
  }, [memes, character]);

  if (playing) {
    return (
      <div className="fixed inset-0">
        <DashCanvas
          characterId={character}
          onExit={() => setPlaying(false)}
          onRunComplete={handleRun}
        />
        <MemeCommentator isPlaying={playing} characterId={character} />
        {result?.won && !cinematicDone && (
          <VictoryCinematic
            characterId={character}
            playerName={result.name}
            context={ctxFlags}
            onComplete={() => setCinematicDone(true)}
          />
        )}
        {result && cinematicDone && (
          <ResultTicker
            visible={true}
            mode="dash"
            data={buildDashResult({
              characterId: character,
              winnerName: result.name,
              mon: result.mon,
              score: result.score,
              distance: result.distance,
              combo: result.combo,
              context: ctxFlags,
            })}
          />
        )}
      </div>
    );
  }

  return (
    <CharacterSelect
      selected={character}
      onSelect={setCharacter}
      onConfirm={() => setPlaying(true)}
      onBack={() => router.push("/play")}
      title="🥚 SPERM DASH"
      subtitle="Swim · Dodge · Survive · Reach the Egg"
      confirmLabel="▶ START SWIMMING"
    />
  );
}

export default function Page() {
  return (
    <DashPage />
  );
}
