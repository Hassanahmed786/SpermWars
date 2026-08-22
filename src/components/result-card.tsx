"use client";

import React, { useRef, useState, useCallback } from "react";
import MonadLogo from "./monad-logo";
import { drawSpermByCharacter } from "@/lib/sperm-art";
import { pickCharacterMeme, RARITY_COLOR, RARITY_LABEL, type Rarity, type ContextFlag } from "@/data/character-memes";
import { getCharacterDef } from "@/lib/game-config";
import { audio, sfx } from "@/lib/audio";

export interface ResultData {
  characterId: string;
  winnerName: string;
  memeText: string;
  /** rarity of the meme line, used to badge the card */
  memeRarity?: Rarity;
  monReward: number;
  score?: number;
  /** "arena" | "dash" — affects layout */
  mode: "arena" | "dash";
  /** dash extras */
  distance?: number;
  combo?: number;
}

const W = 720;
const H = 1080;

export function renderResultCard(c: HTMLCanvasElement, d: ResultData): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // background gradient
  const bg = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H / 2, W);
  bg.addColorStop(0, "#2a0a4a");
  bg.addColorStop(0.5, "#100226");
  bg.addColorStop(1, "#05000d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ring decorations
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.4, 180 + i * 70, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(168,85,247,${0.10 - i * 0.02})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // header
  ctx.fillStyle = "#e9d5ff";
  ctx.font = "bold 36px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SPERM WARS", W / 2, 90);
  ctx.font = "600 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#c4b5fd";
  ctx.fillText("MONAD EDITION", W / 2, 120);

  // trophy + egg
  ctx.font = "120px sans-serif";
  ctx.fillText("🥚", W / 2, 260);

  // CHAMPION
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 28px Inter, sans-serif";
  ctx.fillText("👑 MONAD CHAMPION 👑", W / 2, 320);

  // sperm character — draw at the centre
  drawSpermByCharacter(ctx, d.characterId, {
    x: W / 2, y: 470, r: 60, angle: 0, time: performance.now(),
    color: undefined as unknown as string, // ignored by accessory-based choice
    expression: "happy", effort: 0.6, boosting: true, seed: 1,
  });

  // persona name (the character identity) + the player's handle underneath
  const def = getCharacterDef(d.characterId);
  ctx.fillStyle = def.color;
  ctx.font = "bold 40px Inter, sans-serif";
  ctx.fillText(def.name, W / 2, 570);
  ctx.fillStyle = "rgba(233,213,255,0.65)";
  ctx.font = "500 20px Inter, sans-serif";
  ctx.fillText(d.winnerName, W / 2, 598);

  // rarity badge for non-common lines
  if (d.memeRarity && d.memeRarity !== "common") {
    const label = RARITY_LABEL[d.memeRarity];
    const col = RARITY_COLOR[d.memeRarity];
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    const bw = ctx.measureText(label).width + 26;
    roundedRect(ctx, W / 2 - bw / 2, 612, bw, 24, 12);
    ctx.fillStyle = `${col}22`;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fillText(label, W / 2, 629);
  }

  // Meme card
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  const cardX = 80, cardY = 648, cardW = W - 160, cardH = 110;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,215,0,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // open quote
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 30px Inter, sans-serif";
  ctx.fillText("\u201C", cardX + 24, cardY + 48);
  ctx.fillStyle = "#ffe8a3";
  ctx.font = "italic 22px Inter, sans-serif";
  wrapText(ctx, d.memeText, W / 2 + 10, cardY + 50, cardW - 80, 28);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 30px Inter, sans-serif";
  ctx.fillText("\u201D", cardX + cardW - 40, cardY + cardH - 20);

  // stats panel
  const statY = 780;
  ctx.fillStyle = "rgba(139,92,246,0.08)";
  roundedRect(ctx, 80, statY, W - 160, 180, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (d.mode === "arena") {
    statRow(ctx, W / 2 - 140, statY + 50, "MON REWARD", `+${d.monReward}`, "#ffd700");
    statRow(ctx, W / 2 + 60, statY + 50, "SCORE", (d.score ?? 0).toLocaleString(), "#c4b5fd");
    statRow(ctx, W / 2 - 140, statY + 130, "GAMES", "0", "#e9d5ff");
    statRow(ctx, W / 2 + 60, statY + 130, "BEST STREAK", "0", "#39ff14");
  } else {
    statRow(ctx, W / 2 - 140, statY + 50, "DISTANCE", `${d.distance ?? 0}m`, "#c4b5fd");
    statRow(ctx, W / 2 + 60, statY + 50, "SCORE", (d.score ?? 0).toLocaleString(), "#e9d5ff");
    statRow(ctx, W / 2 - 140, statY + 130, "MON", `${d.monReward}`, "#ffd700");
    statRow(ctx, W / 2 + 60, statY + 130, "COMBO", `x${d.combo ?? 1}`, "#ff7ad9");
  }

  // footer
  ctx.fillStyle = "rgba(168,85,247,0.5)";
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillText("— s p e r m w a r s . x y z —", W / 2, H - 40);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function statRow(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string, color: string): void {
  ctx.fillStyle = "rgba(196,181,253,0.55)";
  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y);
  ctx.fillStyle = color;
  ctx.font = "bold 30px Inter, sans-serif";
  ctx.fillText(value, x, y + 32);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): void {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = `${line}${line ? " " : ""}${w}`;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}

/* ── React trigger component ───────────────────────────────── */
export function ResultCardButton({ data, label = "SHARE RESULT" }: { data: ResultData; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const render = useCallback(() => {
    if (!ref.current) return null;
    renderResultCard(ref.current, data);
    return ref.current.toDataURL("image/png");
  }, [data]);

  const handleShare = useCallback(async () => {
    sfx("click");
    audio.init();
    const url = render();
    if (!url) return;
    setDataUrl(url);
    setOpen(true);

    if (navigator.share && navigator.canShare) {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const file = new File([blob], "sperm-wars-result.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Sperm Wars — Monad Edition",
            text: "I just won Sperm Wars on Monad 🏆",
            files: [file],
          });
          return;
        }
      } catch { /* fall through to copy */ }
    }
    // fall through → keep the open sheet so the user can copy or download
  }, [render]);

  const download = useCallback(() => {
    if (!dataUrl) return;
    sfx("coin");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "sperm-wars-result.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [dataUrl]);

  const copy = useCallback(async () => {
    if (!dataUrl) return;
    sfx("coin");
    try {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      // ignore — download still works
    }
  }, [dataUrl]);

  return (
    <>
      <button
        onClick={handleShare}
        onMouseEnter={() => sfx("hover")}
        className="glow-btn text-base px-6 py-3"
      >
        📤 {label}
      </button>
      <canvas ref={ref} className="hidden" />
      {open && dataUrl && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-4 modal-backdrop"
          onClick={() => setOpen(false)}>
          <div className="rounded-3xl p-5 max-w-sm w-full modal-pop"
            style={{ background: "linear-gradient(160deg, rgba(24,8,44,.98), rgba(10,2,22,.98))", border: "1px solid rgba(139,92,246,.35)" }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black text-white mb-2">Share your result</p>
            <p className="text-[11px] text-purple-300/70 mb-3">Image is rendered below. Download or copy to share.</p>
            <div className="rounded-2xl overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Sperm Wars result" className="w-full h-auto block" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={copy} className="flex-1 glow-btn text-xs py-2">
                {copyState === "copied" ? "✓ COPIED" : "📋 COPY"}
              </button>
              <button onClick={download} className="flex-1 glow-btn glow-btn-pink text-xs py-2">⬇ DOWNLOAD</button>
              <button onClick={() => setOpen(false)} className="flex-1 glow-btn text-xs py-2">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Persona-aware meme picker for the result card. */
export function winMemeFor(characterId: string, context: ContextFlag[] = []): string {
  const line = pickCharacterMeme(characterId, "victory", context);
  return line?.text ?? "MONAD CHAMPION";
}

/** Same, but keeps the rarity so the card can badge Legendary drops. */
export function winMemeWithRarity(
  characterId: string,
  context: ContextFlag[] = []
): { text: string; rarity: Rarity } {
  const line = pickCharacterMeme(characterId, "victory", context);
  return { text: line?.text ?? "MONAD CHAMPION", rarity: line?.rarity ?? "common" };
}
