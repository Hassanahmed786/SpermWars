/**
 * SPERM DASH renderer — parallax biological canal, obstacles, MON,
 * power-ups, boss visuals, the final egg, and a full arcade HUD.
 */

import {
  DashState, DASH_W, DASH_H, FLOOR_Y, CEIL_Y, PLAYER_X, EGG_DISTANCE,
  powerColor, powerIcon, type PowerKind,
} from "./dash-engine";
import { drawSpermByCharacter } from "./sperm-art";
import { CHARACTERS, getCharacterDef } from "./game-config";

export function renderDash(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  s: DashState,
  characterId: string,
  time: number,
  best: { score: number; distance: number }
): void {
  const char = getCharacterDef(characterId);

  // fit the virtual 1280x620 stage into the canvas (letterbox)
  const scale = Math.min(cw / DASH_W, ch / DASH_H);
  const ox = (cw - DASH_W * scale) / 2;
  const oy = (ch - DASH_H * scale) / 2;

  ctx.save();
  ctx.fillStyle = "#05010d";
  ctx.fillRect(0, 0, cw, ch);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  // camera shake + zoom
  ctx.save();
  const sx = (Math.random() - 0.5) * s.shake;
  const sy = (Math.random() - 0.5) * s.shake;
  ctx.translate(DASH_W / 2 + sx, DASH_H / 2 + sy);
  ctx.scale(s.camZoom, s.camZoom);
  ctx.translate(-DASH_W / 2, -DASH_H / 2);

  drawBackground(ctx, s, time);
  drawCanal(ctx, s, time);
  if (s.distance > EGG_DISTANCE - 900) drawFinalEgg(ctx, s, time);
  drawMons(ctx, s, time);
  drawPowers(ctx, s, time);
  drawObstacles(ctx, s, time);
  drawBoss(ctx, s, time);
  drawParticles(ctx, s);
  drawPlayer(ctx, s, char, time);

  ctx.restore();

  // full-screen flash
  if (s.flash > 0) {
    ctx.fillStyle = `rgba(200,160,255,${s.flash * 0.5})`;
    ctx.fillRect(0, 0, DASH_W, DASH_H);
  }
  // damage vignette
  if (s.hitFlash > 0) {
    const g = ctx.createRadialGradient(DASH_W / 2, DASH_H / 2, DASH_H * 0.25, DASH_W / 2, DASH_H / 2, DASH_H * 0.75);
    g.addColorStop(0, "rgba(255,0,60,0)");
    g.addColorStop(1, `rgba(255,0,60,${s.hitFlash * 0.55})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DASH_W, DASH_H);
  }
  // speed lines
  if (s.speedMult > 1.35) {
    const n = Math.floor((s.speedMult - 1.35) * 26);
    ctx.strokeStyle = `rgba(196,181,253,${Math.min(0.4, (s.speedMult - 1.35) * 0.35)})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const y = ((i * 137 + time * 0.6) % DASH_H);
      const len = 60 + (i % 5) * 40;
      const x = ((i * 311 - time * s.speedMult * 1.6) % (DASH_W + 300));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y);
      ctx.stroke();
    }
  }

  drawHUD(ctx, s, char, time, best);
  ctx.restore();
}

/* ── BACKGROUND (parallax) ─────────────────────────────────────── */
function drawBackground(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  const eggGlow = Math.max(0, (s.distance - (EGG_DISTANCE - 1200)) / 1200);
  const g = ctx.createLinearGradient(0, 0, 0, DASH_H);
  g.addColorStop(0, `rgb(${18 + eggGlow * 40},${2 + eggGlow * 8},${34 + eggGlow * 30})`);
  g.addColorStop(0.5, `rgb(${26 + eggGlow * 55},${4 + eggGlow * 10},${52 + eggGlow * 44})`);
  g.addColorStop(1, `rgb(${12 + eggGlow * 30},${1 + eggGlow * 5},${26 + eggGlow * 22})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DASH_W, DASH_H);

  // far layer — big soft cells
  layer(ctx, s, 0.12, 7, (x, y, i) => {
    const r = 90 + ((i * 37) % 70);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139,92,246,${0.04 + (i % 3) * 0.012})`;
    ctx.fill();
  });

  // mid layer — DNA helices
  layer(ctx, s, 0.3, 5, (x, _y, i) => {
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let k = 0; k < 26; k++) {
      const yy = (k / 26) * DASH_H;
      const w = Math.sin(k * 0.55 + time * 0.0016 + i) * 34;
      ctx.beginPath();
      ctx.arc(x + w, yy, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 ? "#8b5cf6" : "#ff4fa3";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - w, yy, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = k % 2 ? "#ff4fa3" : "#8b5cf6";
      ctx.fill();
      if (k % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + w, yy);
        ctx.lineTo(x - w, yy);
        ctx.strokeStyle = "rgba(190,150,255,0.35)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // near layer — drifting bubbles
  layer(ctx, s, 0.55, 16, (x, y, i) => {
    const r = 5 + ((i * 13) % 14);
    const yy = y + Math.sin(time * 0.001 + i) * 26;
    ctx.beginPath();
    ctx.arc(x, yy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190,160,255,${0.10 + (i % 4) * 0.03})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - r * 0.3, yy - r * 0.3, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
  });
}

function layer(
  ctx: CanvasRenderingContext2D, s: DashState, par: number, count: number,
  draw: (x: number, y: number, i: number) => void
): void {
  const span = DASH_W + 400;
  for (let i = 0; i < count; i++) {
    const base = (i / count) * span;
    const x = ((base - s.px * par) % span + span) % span - 200;
    const y = ((i * 197) % (DASH_H - 120)) + 60;
    draw(x, y, i);
  }
}

/* ── CANAL walls ───────────────────────────────────────────────── */
function drawCanal(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  const wall = (top: boolean) => {
    const y0 = top ? 0 : FLOOR_Y;
    const h = top ? CEIL_Y : DASH_H - FLOOR_Y;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    if (top) { g.addColorStop(0, "rgba(70,20,110,0.95)"); g.addColorStop(1, "rgba(40,8,70,0.55)"); }
    else { g.addColorStop(0, "rgba(40,8,70,0.55)"); g.addColorStop(1, "rgba(70,20,110,0.95)"); }
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, DASH_W, h);

    // organic wobbling membrane edge
    ctx.beginPath();
    const edgeY = top ? CEIL_Y : FLOOR_Y;
    ctx.moveTo(0, edgeY);
    for (let x = 0; x <= DASH_W; x += 16) {
      const w = Math.sin((x + s.px) * 0.013 + time * 0.002) * 7 +
                Math.sin((x + s.px) * 0.031 - time * 0.0031) * 4;
      ctx.lineTo(x, edgeY + (top ? w : -w));
    }
    ctx.strokeStyle = "rgba(196,181,253,0.5)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // cilia
    ctx.strokeStyle = "rgba(196,181,253,0.22)";
    ctx.lineWidth = 1.6;
    for (let x = -((s.px * 0.9) % 26); x < DASH_W; x += 26) {
      const sway = Math.sin((x + s.px) * 0.05 + time * 0.006) * 6;
      ctx.beginPath();
      ctx.moveTo(x, edgeY);
      ctx.lineTo(x + sway, edgeY + (top ? 16 : -16));
      ctx.stroke();
    }
  };
  wall(true);
  wall(false);
}

/* ── OBSTACLES ─────────────────────────────────────────────────── */
function drawObstacles(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  for (const o of s.obstacles) {
    const x = o.x - s.px + PLAYER_X;
    if (x < -300 || x > DASH_W + 300) continue;

    switch (o.kind) {
      case "immune":
      case "mover": {
        const r = o.w / 2;
        const cx = x + r, cy = o.y;
        const red = o.kind === "immune";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = red ? "rgba(255,60,90,0.10)" : "rgba(255,140,60,0.10)";
        ctx.fill();
        // spikes
        ctx.strokeStyle = red ? "#ff4d6d" : "#ff9d3c";
        ctx.lineWidth = 3;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + time * 0.0016 + o.phase;
          const wob = 1 + Math.sin(time * 0.005 + i) * 0.12;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
          ctx.lineTo(cx + Math.cos(a) * r * 1.32 * wob, cy + Math.sin(a) * r * 1.32 * wob);
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        g.addColorStop(0, red ? "#ff8fa3" : "#ffc48f");
        g.addColorStop(1, red ? "#a80f2e" : "#a8560f");
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = red ? "#ff2d55" : "#ff8c1a";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // angry face so it reads as a "creature"
        ctx.fillStyle = "#2a0010";
        ctx.beginPath(); ctx.arc(cx - r * 0.28, cy - r * 0.12, r * 0.13, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.28, cy - r * 0.12, r * 0.13, 0, 6.3); ctx.fill();
        ctx.strokeStyle = "#2a0010"; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.34, r * 0.3, 3.5, 5.9); ctx.stroke();
        break;
      }

      case "dnaBar": {
        if (o.h <= 2) break;
        ctx.fillStyle = "rgba(139,92,246,0.14)";
        ctx.fillRect(x - 5, o.y, o.w + 10, o.h);
        const steps = Math.max(2, Math.floor(o.h / 22));
        for (let i = 0; i < steps; i++) {
          const yy = o.y + (i / steps) * o.h + 11;
          const w = Math.sin(i * 0.7 + time * 0.003 + o.phase) * (o.w * 0.42);
          ctx.beginPath(); ctx.arc(x + o.w / 2 + w, yy, 5, 0, 6.3);
          ctx.fillStyle = i % 2 ? "#a855f7" : "#ff4fa3"; ctx.fill();
          ctx.beginPath(); ctx.arc(x + o.w / 2 - w, yy, 5, 0, 6.3);
          ctx.fillStyle = i % 2 ? "#ff4fa3" : "#a855f7"; ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x + o.w / 2 + w, yy); ctx.lineTo(x + o.w / 2 - w, yy);
          ctx.strokeStyle = "rgba(220,190,255,0.55)"; ctx.lineWidth = 2; ctx.stroke();
        }
        break;
      }

      case "fragment": {
        ctx.save();
        ctx.translate(x + o.w / 2, o.y + o.h / 2);
        ctx.rotate(Math.sin(time * 0.001 + o.phase) * 0.25);
        ctx.beginPath();
        const R = o.w / 2;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const rr = R * (0.72 + ((i * 13) % 5) / 12);
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(-R, -R, R, R);
        g.addColorStop(0, "#6b5f8a"); g.addColorStop(1, "#39304f");
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "#a99ccb"; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        break;
      }

      case "vortex": {
        const cx = x + o.w / 2, cy = o.y, R = o.w / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.004);
        for (let a = 0; a < 4; a++) {
          ctx.beginPath();
          for (let t = 0; t < 42; t++) {
            const th = (t / 42) * Math.PI * 2.4 + (a / 4) * Math.PI * 2;
            const rr = (t / 42) * R * 1.7;
            const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
            t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.strokeStyle = `rgba(168,85,247,${0.5 - a * 0.09})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, R * 0.28, 0, 6.3);
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.28);
        cg.addColorStop(0, "#1a0030"); cg.addColorStop(1, "#8b5cf6");
        ctx.fillStyle = cg; ctx.fill();
        ctx.restore();
        break;
      }

      case "electric": {
        ctx.strokeStyle = o.active ? "#ffe066" : "rgba(120,110,60,0.4)";
        ctx.lineWidth = o.active ? 3 : 1.5;
        // emitters
        ctx.fillStyle = o.active ? "#ffe066" : "#5a5230";
        ctx.fillRect(x - 5, o.y - 6, o.w + 10, 12);
        ctx.fillRect(x - 5, o.y + o.h - 6, o.w + 10, 12);
        if (o.active) {
          ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 14;
          for (let k = 0; k < 2; k++) {
            ctx.beginPath();
            ctx.moveTo(x + o.w / 2, o.y);
            let yy = o.y;
            while (yy < o.y + o.h) {
              yy += 16 + Math.random() * 14;
              ctx.lineTo(x + o.w / 2 + (Math.random() - 0.5) * 20, Math.min(yy, o.y + o.h));
            }
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
        break;
      }

      case "bubble": {
        const r = o.w / 2, cx = x + r, cy = o.y;
        const wob = 1 + Math.sin(time * 0.004 + o.phase) * 0.07;
        ctx.beginPath(); ctx.arc(cx, cy, r * wob, 0, 6.3);
        ctx.fillStyle = "rgba(120,200,255,0.14)"; ctx.fill();
        ctx.strokeStyle = "rgba(150,220,255,0.75)"; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - r * 0.34, cy - r * 0.34, r * 0.22, 0, 6.3);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
        break;
      }

      case "toxic": {
        const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
        g.addColorStop(0, "rgba(80,255,120,0.42)");
        g.addColorStop(1, "rgba(20,120,50,0.18)");
        ctx.fillStyle = g;
        ctx.fillRect(x, o.y, o.w, o.h);
        ctx.strokeStyle = "#5cff8f"; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= o.w; px += 12) {
          const yy = o.y + Math.sin((px + s.px) * 0.05 + time * 0.006) * 6;
          px === 0 ? ctx.moveTo(x + px, yy) : ctx.lineTo(x + px, yy);
        }
        ctx.stroke();
        for (let i = 0; i < o.w / 70; i++) {
          const bx = x + ((i * 71 + time * 0.05) % o.w);
          const by = o.y + o.h / 2 + Math.sin(time * 0.004 + i) * o.h * 0.3;
          ctx.beginPath(); ctx.arc(bx, by, 4, 0, 6.3);
          ctx.fillStyle = "rgba(150,255,180,0.6)"; ctx.fill();
        }
        break;
      }
    }
  }
}

/* ── MON crystals ──────────────────────────────────────────────── */
function drawMons(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  for (const m of s.mons) {
    const x = m.x - s.px + PLAYER_X;
    if (x < -60 || x > DASH_W + 60) continue;
    const pulse = 1 + Math.sin(m.phase + time * 0.004) * 0.16;
    const r = m.r * pulse;

    ctx.beginPath(); ctx.arc(x, m.y, r * 2.6, 0, 6.3);
    ctx.fillStyle = "rgba(255,215,0,0.11)"; ctx.fill();

    // diamond crystal (Monad-ish)
    ctx.save();
    ctx.translate(x, m.y);
    ctx.rotate(time * 0.002 + m.phase);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.35); ctx.lineTo(-r, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, "#fff6c9"); g.addColorStop(0.5, "#ffd700"); g.addColorStop(1, "#ff9500");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(0, r * 1.35);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
    ctx.restore();
  }
}

/* ── POWER-UPS ─────────────────────────────────────────────────── */
function drawPowers(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  for (const p of s.powers) {
    const x = p.x - s.px + PLAYER_X;
    if (x < -80 || x > DASH_W + 80) continue;
    const col = powerColor(p.kind);
    const bob = Math.sin(p.phase + time * 0.003) * 8;
    const y = p.y + bob;

    ctx.beginPath(); ctx.arc(x, y, p.r * 2.4, 0, 6.3);
    ctx.fillStyle = col + "22"; ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 0.002 + p.phase) * 0.28);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * p.r, py = Math.sin(a) * p.r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(10,0,24,0.85)"; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.restore();

    ctx.font = `${p.r * 1.15}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(powerIcon(p.kind), x, y + 1);
    ctx.textBaseline = "alphabetic";
  }
}

/* ── BOSS visuals ──────────────────────────────────────────────── */
function drawBoss(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  if (s.boss !== "chase") return;
  const cx = s.bossX, cy = DASH_H / 2;
  const R = 210 + Math.sin(time * 0.003) * 12;

  const g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.5);
  g.addColorStop(0, "rgba(255,40,80,0.55)");
  g.addColorStop(1, "rgba(255,40,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - R * 1.6, 0, R * 3.2, DASH_H);

  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.3);
  const bg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  bg.addColorStop(0, "#ff7a91"); bg.addColorStop(0.6, "#c40f38"); bg.addColorStop(1, "#5c0018");
  ctx.fillStyle = bg; ctx.fill();

  ctx.strokeStyle = "#ff2d55"; ctx.lineWidth = 6;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + time * 0.001;
    const w = 1 + Math.sin(time * 0.006 + i) * 0.14;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
    ctx.lineTo(cx + Math.cos(a) * R * 1.25 * w, cy + Math.sin(a) * R * 1.25 * w);
    ctx.stroke();
  }
  // furious face
  ctx.fillStyle = "#2a0010";
  ctx.beginPath(); ctx.arc(cx + R * 0.34, cy - R * 0.24, R * 0.13, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + R * 0.34, cy + R * 0.24, R * 0.13, 0, 6.3); ctx.fill();
  ctx.strokeStyle = "#2a0010"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx + R * 0.5, cy, R * 0.3, -1.0, 1.0); ctx.stroke();
}

/* ── FINAL EGG ─────────────────────────────────────────────────── */
function drawFinalEgg(ctx: CanvasRenderingContext2D, s: DashState, time: number): void {
  const eggWorldX = EGG_DISTANCE * 12 + 700;
  const x = eggWorldX - s.px + PLAYER_X;
  if (x > DASH_W + 900) return;
  const cy = DASH_H / 2;
  const R = 230;

  const g = ctx.createRadialGradient(x, cy, 10, x, cy, R * 2.6);
  g.addColorStop(0, "rgba(255,225,245,0.55)");
  g.addColorStop(0.35, "rgba(255,140,220,0.22)");
  g.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - R * 2.6, 0, R * 5.2, DASH_H);

  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(1, 1.18 + Math.sin(time * 0.002) * 0.03);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3);
  const eg = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.05, 0, 0, R);
  eg.addColorStop(0, "#ffffff"); eg.addColorStop(0.3, "#ffd9ef");
  eg.addColorStop(0.65, "#ff8fd0"); eg.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = eg; ctx.fill();
  ctx.restore();

  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + time * 0.0011;
    const rr = R * 1.4 + Math.sin(time * 0.003 + i) * 30;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.1, 4.5, 0, 6.3);
    ctx.fillStyle = `rgba(255,190,240,${0.35 + Math.sin(time * 0.004 + i) * 0.3})`;
    ctx.fill();
  }
}

/* ── PARTICLES ─────────────────────────────────────────────────── */
function drawParticles(ctx: CanvasRenderingContext2D, s: DashState): void {
  for (const p of s.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    switch (p.kind) {
      case "text":
        ctx.font = `bold ${p.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.strokeText(p.text ?? "", p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text ?? "", p.x, p.y);
        break;
      case "ring":
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - a), 0, 6.3);
        ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke();
        break;
      case "bubble":
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.3);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.3; ctx.stroke();
        break;
      default:
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, 6.3);
        ctx.fillStyle = p.color; ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/* ── PLAYER ────────────────────────────────────────────────────── */
function drawPlayer(
  ctx: CanvasRenderingContext2D, s: DashState,
  char: typeof CHARACTERS[number], time: number
): void {
  if (s.phase === "dead") return;
  const angle = Math.atan2(s.vy, 620);
  const boosting = s.rocket > 0 || s.turbo > 0;
  const blink = s.invuln > 0 && Math.floor(s.invuln * 12) % 2 === 0;

  if (s.magnet > 0) {
    ctx.beginPath();
    ctx.arc(PLAYER_X, s.py, 300, 0, 6.3);
    ctx.strokeStyle = `rgba(255,122,217,${0.16 + Math.sin(time * 0.008) * 0.08})`;
    ctx.lineWidth = 2; ctx.setLineDash([10, 12]); ctx.stroke(); ctx.setLineDash([]);
  }

  drawSpermByCharacter(ctx, char.id, {
    x: PLAYER_X, y: s.py, r: 21, angle, time,
    color: char.color,
    expression: s.hitFlash > 0.2 ? "hurt" : boosting ? "wow" : s.speedMult > 1.4 ? "determined" : "happy",
    effort: Math.min(1, 0.45 + s.speedMult * 0.4),
    hitFlash: s.hitFlash,
    boosting,
    shielded: s.shield > 0,
    alpha: blink ? 0.45 : 1,
    seed: 1.7,
  });
}

/* ── HUD ───────────────────────────────────────────────────────── */
function drawHUD(
  ctx: CanvasRenderingContext2D, s: DashState,
  char: typeof CHARACTERS[number], time: number,
  best: { score: number; distance: number }
): void {
  // top bar
  ctx.fillStyle = "rgba(8,0,20,0.55)";
  ctx.fillRect(0, 0, DASH_W, 54);
  ctx.strokeStyle = "rgba(139,92,246,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(DASH_W, 54); ctx.stroke();

  const stat = (x: number, label: string, value: string, color: string) => {
    ctx.font = "10px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "rgba(196,181,253,0.6)";
    ctx.textAlign = "left";
    ctx.fillText(label, x, 20);
    ctx.font = "bold 22px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(value, x, 44);
  };

  stat(24, "DISTANCE", `${Math.floor(s.distance)}m`, "#e9d5ff");
  stat(190, "SCORE", Math.floor(s.score).toLocaleString(), "#ffffff");
  stat(370, "MON", `${s.mon}`, "#ffd700");
  stat(490, "SPEED", `x${s.speedMult.toFixed(1)}`, "#7ae0ff");
  stat(620, "BEST", Math.floor(best.score).toLocaleString(), "#c4b5fd");

  // combo
  if (s.combo > 1) {
    const pop = 1 + Math.max(0, s.comboTimer - 1.9) * 2;
    ctx.save();
    ctx.translate(DASH_W - 140, 30);
    ctx.scale(pop, pop);
    ctx.font = "bold 26px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff7ad9";
    ctx.fillText(`x${s.combo}`, 0, 8);
    ctx.font = "9px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,180,230,0.75)";
    ctx.fillText("COMBO", 0, 20);
    ctx.restore();
    // combo timer bar
    ctx.fillStyle = "rgba(255,122,217,0.25)";
    ctx.fillRect(DASH_W - 190, 44, 100, 4);
    ctx.fillStyle = "#ff7ad9";
    ctx.fillRect(DASH_W - 190, 44, 100 * Math.max(0, s.comboTimer / 2.2), 4);
  }

  // character chip
  ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = char.color;
  ctx.fillText(char.name.toUpperCase(), DASH_W - 24, 46);

  // active power-ups
  const active: { k: PowerKind; t: number; max: number }[] = [];
  if (s.turbo > 0) active.push({ k: "turbo", t: s.turbo, max: 6 });
  if (s.shield > 0) active.push({ k: "shield", t: s.shield, max: 12 });
  if (s.magnet > 0) active.push({ k: "magnet", t: s.magnet, max: 8 });
  if (s.rocket > 0) active.push({ k: "rocket", t: s.rocket, max: 4.5 });
  active.forEach((p, i) => {
    const x = 24 + i * 74, y = 70;
    ctx.fillStyle = "rgba(8,0,20,0.6)";
    ctx.fillRect(x, y, 64, 26);
    ctx.strokeStyle = powerColor(p.k); ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, 64, 26);
    ctx.fillStyle = powerColor(p.k) + "44";
    ctx.fillRect(x, y, 64 * (p.t / p.max), 26);
    ctx.font = "13px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(powerIcon(p.k), x + 6, y + 18);
    ctx.font = "bold 11px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${p.t.toFixed(1)}s`, x + 26, y + 18);
  });

  // egg progress bar
  const prog = Math.min(1, s.distance / EGG_DISTANCE);
  const bw = 340, bx = DASH_W / 2 - bw / 2, by = DASH_H - 26;
  ctx.fillStyle = "rgba(8,0,20,0.6)";
  ctx.fillRect(bx, by, bw, 10);
  const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  pg.addColorStop(0, "#8b5cf6"); pg.addColorStop(1, "#ff7ad9");
  ctx.fillStyle = pg;
  ctx.fillRect(bx, by, bw * prog, 10);
  ctx.strokeStyle = "rgba(196,181,253,0.4)"; ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, 10);
  ctx.font = "16px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("🥚", bx + bw + 16, by + 11);
  ctx.font = "9px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "rgba(196,181,253,0.7)";
  ctx.fillText(`${Math.floor(prog * 100)}% TO THE EGG`, DASH_W / 2, by - 6);

  // boss timer
  if (s.boss === "chase" || s.boss === "tunnel" || s.boss === "surge") {
    const w = 260, x = DASH_W / 2 - w / 2, y = 108;
    ctx.fillStyle = "rgba(8,0,20,0.7)";
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = s.boss === "chase" ? "#ff4d6d" : s.boss === "tunnel" ? "#a855f7" : "#ffd700";
    const maxT = s.boss === "chase" ? 10 : s.boss === "tunnel" ? 11 : 8;
    ctx.fillRect(x, y, w * Math.max(0, s.bossTimer / maxT), 8);
    ctx.font = "bold 11px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.fillText(`SURVIVE  ${s.bossTimer.toFixed(1)}s`, DASH_W / 2, y - 5);
  }

  // announcement
  if (s.announcement && s.time < s.announceUntil) {
    const k = 1 - (s.announceUntil - s.time) / 3;
    const slide = k < 0.15 ? (1 - k / 0.15) * -80 : k > 0.85 ? (k - 0.85) / 0.15 * 80 : 0;
    ctx.save();
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.translate(DASH_W / 2 + slide, 190);
    ctx.fillStyle = "rgba(8,0,20,0.8)";
    ctx.fillRect(-330, -32, 660, 62);
    ctx.strokeStyle = "#8b5cf6"; ctx.lineWidth = 2;
    ctx.strokeRect(-330, -32, 660, 62);
    ctx.font = "bold 25px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillStyle = "#e9d5ff";
    ctx.fillText(s.announcement, 0, 8);
    ctx.restore();
  }
  void time;
}
