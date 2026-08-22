"use client";

import React, { useEffect, useRef } from "react";
import { useMemes } from "@/lib/meme-engine";
import { sfx } from "@/lib/audio";

/**
 * A floating speech-bubble commentator that periodically fires memetic
 * reactions while the player is in-game. It is ENTIRELY OBSERVATIONAL —
 * the gameplay code is not modified; this is a side-channel that watches
 * `mon` / `health` / `phase` and pushes lines into the meme layer.
 *
 * Disable in dashboard settings (the meme provider's enabled flag).
 */
export default function MemeCommentator({
  isPlaying,
  mon = 0,
  health = 100,
  characterId = "any",
  combo = 1,
}: {
  isPlaying: boolean;
  mon?: number;
  health?: number;
  characterId?: string;
  combo?: number;
}) {
  const { push, enabled } = useMemes();
  const lastMon = useRef(0);
  const lastHealth = useRef(health);
  const lastCombo = useRef(1);
  const lowHealthSaid = useRef(false);
  const bigMoneySaid = useRef(false);
  const fastComment = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drift = useRef(0);

  useEffect(() => {
    if (!isPlaying || !enabled) return;
    // pick a low-rate ambient comment every 18-30s during play
    const tick = () => {
      const chars = ["any", "any", "any", "chaos", "ai", "crypto"]; // weighted to chaos
      const events = ["boost", "any-percent-speedrun", "collect_mon", "use_ability"];
      push(characterId, events[Math.floor(Math.random() * events.length)]);
      const next = 18000 + Math.random() * 12000;
      fastComment.current = setTimeout(tick, next);
    };
    fastComment.current = setTimeout(tick, 12000);
    return () => { if (fastComment.current) clearTimeout(fastComment.current); };
  }, [isPlaying, enabled, characterId, push]);

  useEffect(() => {
    if (!isPlaying || !enabled) return;
    // money milestone
    if (mon - lastMon.current >= 100 && !bigMoneySaid.current) {
      bigMoneySaid.current = true;
      push(characterId, "big_money");
      setTimeout(() => { bigMoneySaid.current = false; }, 8000);
    }
    lastMon.current = mon;
    drift.current = mon;
  }, [mon, characterId, push, isPlaying, enabled]);

  useEffect(() => {
    if (!isPlaying || !enabled) return;
    // low health
    if (health < 25 && !lowHealthSaid.current) {
      lowHealthSaid.current = true;
      push(characterId, "low_health");
      sfx("warning");
    } else if (health >= 60) {
      lowHealthSaid.current = false;
    }
    lastHealth.current = health;
  }, [health, characterId, push, isPlaying, enabled]);

  useEffect(() => {
    if (!isPlaying || !enabled) return;
    if (combo >= 10 && combo % 10 === 0 && combo > lastCombo.current) {
      push(characterId, "combo_milestone");
    }
    lastCombo.current = combo;
  }, [combo, characterId, push, isPlaying, enabled]);

  return null;
}
