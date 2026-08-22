"use client";

import React, { useState, useEffect } from "react";
import MonadLogo from "./monad-logo";
import { ResultCardButton, winMemeWithRarity, type ResultData } from "./result-card";
import type { ContextFlag } from "@/data/character-memes";
import { sfx } from "@/lib/audio";

/**
 * A floating "you just won/lost" pill that slides in from the side of the
 * screen when a match ends, giving the user a one-tap route to the shareable
 * result card. It does NOT replace the in-canvas victory screen — it sits
 * next to it.
 */
export function ResultTicker({
  visible,
  mode,
  data,
}: {
  visible: boolean;
  mode: "arena" | "dash";
  data: ResultData;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (visible) {
      sfx("powerup");
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
    // Reset when the ticker is hidden so the next result animates in again.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed z-40 right-4 bottom-4 transition-all duration-500 ${show ? "translate-x-0 opacity-100" : "translate-x-32 opacity-0"}`}
    >
      <div className="rounded-2xl p-3 flex items-center gap-3 max-w-xs"
        style={{
          background: "linear-gradient(135deg, rgba(20,6,38,.96), rgba(10,2,22,.96))",
          border: "1px solid rgba(168,85,247,.5)",
          boxShadow: "0 12px 40px -10px rgba(168,85,247,.45)",
        }}>
        <MonadLogo size={28} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-widest text-purple-300/60">YOUR RESULT</p>
          <p className="text-xs font-bold truncate" style={{ color: "#ffd700" }}>
            {data.mode === "arena" ? "Chaos Arena" : "Sperm Dash"} — {data.winnerName}
          </p>
        </div>
        <ResultCardButton data={data} label="SHARE" />
      </div>
    </div>
  );
}

/** Helper to build result data for the arena result screen. */
export function buildArenaResult(opts: {
  characterId: string; winnerName: string; mon: number; score: number;
  context?: ContextFlag[];
}): ResultData {
  const meme = winMemeWithRarity(opts.characterId, opts.context ?? []);
  return {
    characterId: opts.characterId,
    winnerName: opts.winnerName,
    memeText: meme.text,
    memeRarity: meme.rarity,
    monReward: opts.mon,
    score: opts.score,
    mode: "arena",
  };
}

/** Helper to build result data for the dash result screen. */
export function buildDashResult(opts: {
  characterId: string; winnerName: string; mon: number; score: number; distance: number; combo: number;
  context?: ContextFlag[];
}): ResultData {
  const meme = winMemeWithRarity(opts.characterId, opts.context ?? []);
  return {
    characterId: opts.characterId,
    winnerName: opts.winnerName,
    memeText: meme.text,
    memeRarity: meme.rarity,
    monReward: opts.mon,
    score: opts.score,
    mode: "dash",
    distance: opts.distance,
    combo: opts.combo,
  };
}
