"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { MEMES, type CharacterId, type Event, type MemeLine } from "@/data/memes";
import {
  pickCharacterMeme, type ContextFlag, type MemeEvent,
} from "@/data/character-memes";

/**
 * Resolves a meme line for a (character, event) pair.
 * Algorithm: pick from the per-character bag for that event; if none,
 * fall back to the per-character "_default" pool; if still none, fall
 * back to the universal "any" bag for the same event, then its default.
 */
/**
 * Maps the engine's fine-grained event names onto the six
 * character-meme buckets in `character-memes.ts`.
 */
const EVENT_TO_CHARACTER_EVENT: Record<string, MemeEvent> = {
  win: "victory",
  lose: "defeat",
  die: "elimination",
  die_near_egg: "defeat",
  die_immediately: "elimination",
  kill: "elimination",
  use_blast: "ability",
  use_ability: "ability",
  boost: "ability",
  collect_mon: "collection",
  big_money: "collection",
  low_health: "comeback",
  combo_milestone: "collection",
};

/**
 * Preferred entry point: tries the rich per-persona pool first (with rarity
 * weighting + context filtering) and falls back to the generic table so
 * nothing ever comes back empty.
 */
export function pickMemeFor(
  characterId: string,
  event: Event | string,
  context: ContextFlag[] = []
): MemeLine {
  const mapped = EVENT_TO_CHARACTER_EVENT[event as string];
  if (mapped) {
    const hit = pickCharacterMeme(characterId, mapped, context);
    if (hit) {
      return {
        text: hit.text,
        category: "internet",
        icon: hit.icon,
        flair: hit.rarity === "legendary" ? 3 : hit.rarity === "rare" ? 2 : 1,
      };
    }
  }
  return pickMeme(characterId, event);
}

export function pickMeme(character: CharacterId | string, event: Event | string): MemeLine {
  const c = (MEMES[character as CharacterId] ?? MEMES.any) ?? MEMES.any;
  const eventPool = c?.[event as Event];
  if (eventPool && eventPool.length) return eventPool[Math.floor(Math.random() * eventPool.length)];

  const def = c?._default;
  if (def && def.length) return def[Math.floor(Math.random() * def.length)];

  const anyEvent = MEMES.any?.[event as Event];
  if (anyEvent && anyEvent.length) return anyEvent[Math.floor(Math.random() * anyEvent.length)];

  return MEMES.any._default?.[0] ?? { text: "ABSOLUTE CINEMA.", category: "victory" };
}

/* ═══════════════════════════════════════════════════════════════
   Toast-style meme broadcast system. Any component can call
   `useMemes().push(charId, event)` and a portal will render the
   animated bubble at the right place (currently a side stack).
   ═══════════════════════════════════════════════════════════════ */

export interface MemeToast {
  id: number;
  text: string;
  icon?: string;
  characterId: string;
  category: string;
  flair: number;
  createdAt: number;
}

interface MemeApi {
  push: (characterId: string, event: Event | string, context?: ContextFlag[]) => void;
  pushDirect: (line: MemeLine, characterId?: string) => void;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
}

const Ctx = createContext<MemeApi | null>(null);
export function useMemes(): MemeApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMemes must be used within <MemeProvider>");
  return v;
}

const STORAGE_KEY = "spermwars.memes.enabled";

export function MemeProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<MemeToast[]>([]);
  const [enabled, setEnabledState] = useState<boolean>(true);
  const idRef = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // restore preference
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      // localStorage is browser-only; must be read after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v !== null) setEnabledState(v !== "0");
    } catch { /* ignore */ }
  }, []);

  const schedule = useCallback((id: number, duration: number) => {
    const ex = timers.current.get(id);
    if (ex) clearTimeout(ex);
    if (duration > 0) timers.current.set(id, setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, duration));
  }, []);

  const push = useCallback((characterId: string, event: Event | string, context: ContextFlag[] = []) => {
    if (!enabled) return;
    const line = pickMemeFor(characterId, event, context);
    const id = idRef.current++;
    const t: MemeToast = { id, text: line.text, icon: line.icon, characterId, category: line.category, flair: line.flair ?? 1, createdAt: Date.now() };
    setToasts((cur) => {
      const next = [...cur, t].slice(-4); // cap at 4 visible
      return next;
    });
    const dur = 2200 + Math.min(2200, line.text.length * 50);
    schedule(id, dur);
  }, [enabled, schedule]);

  const pushDirect = useCallback((line: MemeLine, characterId = "any") => {
    const id = idRef.current++;
    const t: MemeToast = { id, text: line.text, icon: line.icon, characterId, category: line.category, flair: line.flair ?? 1, createdAt: Date.now() };
    setToasts((cur) => [...cur, t].slice(-4));
    schedule(id, 2400 + Math.min(2200, line.text.length * 50));
  }, [schedule]);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  return (
    <Ctx.Provider value={{ push, pushDirect, enabled, setEnabled }}>
      {children}
      <div className="fixed z-[80] left-1/2 -translate-x-1/2 top-16 flex flex-col items-center gap-2 pointer-events-none w-[min(560px,calc(100vw-2rem))]">
        {toasts.map((t) => <MemeBubble key={t.id} toast={t} />)}
      </div>
    </Ctx.Provider>
  );
}

function MemeBubble({ toast }: { toast: MemeToast }) {
  return (
    <div
      className="pointer-events-auto rounded-2xl px-4 py-2 flex items-center gap-2.5 meme-bubble-in"
      style={{
        background: "linear-gradient(135deg, rgba(20,6,38,.95), rgba(10,2,22,.95))",
        border: `1px solid rgba(168,85,247,${0.35 + toast.flair * 0.15})`,
        boxShadow: toast.flair >= 2
          ? `0 12px 40px -10px rgba(168,85,247,${0.4 + toast.flair * 0.1}), 0 0 24px -6px rgba(168,85,247,0.5)`
          : "0 8px 24px -10px rgba(0,0,0,.7)",
        maxWidth: "100%",
      }}
    >
      <span className="text-xl" style={{ filter: toast.flair >= 2 ? `drop-shadow(0 0 6px ${CATEGORY_COLORS[toast.category] ?? "#a78bfa"})` : "none" }}>
        {toast.icon ?? "💬"}
      </span>
      <span className="text-sm font-black tracking-tight" style={{ color: CATEGORY_COLORS[toast.category] ?? "#e9d5ff" }}>
        {toast.text}
      </span>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  political: "#ff7ad9",
  web3: "#836ef9",
  sports: "#ffd700",
  gaming: "#39ff14",
  internet: "#7ae0ff",
  ai: "#c4b5fd",
  crypto: "#ffd700",
  fail: "#ff6b8a",
  comeback: "#5cff8f",
  victory: "#ffd700",
  chaos: "#ff1493",
};
