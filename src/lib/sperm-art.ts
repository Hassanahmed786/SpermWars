/**
 * SPERM ART — shared cartoon sperm character renderer.
 *
 * Draws a *clearly recognisable* cartoon sperm:
 *   - oval head (taller than wide, tapered at the back)
 *   - big expressive cartoon eyes + mouth
 *   - long thin whipping tail with sine-wave physics
 *   - per-character accessories (helmet, shades, tie, antenna, goggles, jester hat)
 *
 * Used by BOTH games (Chaos Arena + Sperm Dash) so characters look identical.
 */

export type Expression = "idle" | "happy" | "angry" | "hurt" | "dead" | "wow" | "determined";

export interface SpermDrawOptions {
  x: number;
  y: number;
  /** head radius (the "size" of the character) */
  r: number;
  /** direction the sperm is facing, radians */
  angle: number;
  /** ms timestamp, drives tail wave + blinking */
  time: number;
  color: string;
  accessory: AccessoryKind;
  expression?: Expression;
  /** 0..1 — how hard the tail whips (speed) */
  effort?: number;
  /** 0..1 red flash when hit */
  hitFlash?: number;
  /** draws a rocket flame out the back */
  boosting?: boolean;
  /** cyan bubble shield */
  shielded?: boolean;
  /** global alpha */
  alpha?: number;
  /** squash/stretch multiplier */
  scale?: number;
  /** unique-ish number so characters don't animate in lockstep */
  seed?: number;
}

export type AccessoryKind =
  | "helmet"      // space / mars mogul
  | "tie"         // politician / swimmer-in-chief
  | "antenna"     // ai / ai overlord
  | "shades"      // crypto / defi degen
  | "goggles"     // scientist / mad scientist
  | "jester"      // chaos
  // ── persona accessories ──
  | "sash"        // prime swimmer
  | "bowler"      // the right honourable
  | "btccoin"     // bitcoin maxi
  | "hardhat"     // blockchain builder
  | "monadhalo"   // monad maxi (flagship)
  | "mic"         // pop star
  | "headband"    // football legend
  | "headset"     // gamer
  | "hoodie"      // tech bro
  | "starshades"  // movie star
  | "none";

/** Map character id -> accessory. Keeps game-config free of render concerns. */
export const ACCESSORY_BY_CHARACTER: Record<string, AccessoryKind> = {
  // base gameplay archetypes
  space: "helmet",
  politician: "tie",
  ai: "antenna",
  crypto: "shades",
  scientist: "goggles",
  chaos: "jester",
  // personas (src/data/roster.ts)
  prime_swimmer: "sash",
  swimmer_in_chief: "tie",
  right_honourable: "bowler",
  mars_mogul: "helmet",
  ai_overlord: "antenna",
  tech_bro: "hoodie",
  monad_maxi: "monadhalo",
  bitcoin_maxi: "btccoin",
  defi_degen: "shades",
  chain_builder: "hardhat",
  pop_star: "mic",
  football_legend: "headband",
  movie_star: "starshades",
  gamer: "headset",
  mad_scientist: "goggles",
};

/** Slightly darken / lighten a hex colour. */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/**
 * MAIN ENTRY — draw a full cartoon sperm.
 * Everything is drawn in local space then rotated so `angle` points "forward".
 */
export function drawSperm(ctx: CanvasRenderingContext2D, o: SpermDrawOptions): void {
  const {
    x, y, r, angle, time, color, accessory,
    expression = "idle",
    effort = 0.5,
    hitFlash = 0,
    boosting = false,
    shielded = false,
    alpha = 1,
    scale = 1,
    seed = 0,
  } = o;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const t = time * 0.001;
  // tail whips faster + wider the harder you swim
  const whip = 0.35 + effort * 0.9;
  const waveSpeed = 9 + effort * 11;

  // ── TAIL (drawn first, behind head) ───────────────────────────
  drawTail(ctx, r, t, waveSpeed, whip, color, seed, boosting);

  // ── ROCKET FLAME ──────────────────────────────────────────────
  if (boosting) drawFlame(ctx, r, time, seed);

  // ── HEAD ──────────────────────────────────────────────────────
  drawHead(ctx, r, color, hitFlash);

  // ── FACE ──────────────────────────────────────────────────────
  drawFace(ctx, r, expression, time, seed);

  // ── ACCESSORY ─────────────────────────────────────────────────
  drawAccessory(ctx, r, accessory, color, time, seed);

  // ── SHIELD BUBBLE ─────────────────────────────────────────────
  if (shielded) {
    const pulse = 1 + Math.sin(time * 0.008) * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.05 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(120,230,255,${0.5 + Math.sin(time * 0.01) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.05 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,230,255,0.07)";
    ctx.fill();
    // highlight arc
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.05 * pulse, -2.4, -1.5);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAIL                                                          */
/* ══════════════════════════════════════════════════════════════ */
function drawTail(
  ctx: CanvasRenderingContext2D,
  r: number,
  t: number,
  waveSpeed: number,
  whip: number,
  color: string,
  seed: number,
  boosting: boolean
): void {
  const SEGMENTS = 22;
  const tailLen = r * (boosting ? 5.2 : 4.4);
  const pts: { x: number; y: number; w: number }[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const p = i / SEGMENTS;                    // 0 at head, 1 at tip
    const px = -r * 0.75 - p * tailLen;        // extends backwards (-x)
    // amplitude grows toward the tip = classic flagellum whip
    const amp = r * 0.95 * whip * Math.pow(p, 1.35);
    const py = Math.sin(p * 7.2 - t * waveSpeed + seed) * amp;
    const w = Math.max(0.6, r * 0.34 * (1 - p * 0.92)); // tapers to a point
    pts.push({ x: px, y: py, w });
  }

  // soft outer glow of the tail
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.restore();

  // tapered ribbon body — two edges + fill so it narrows to a point
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y - pts[0].w);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    ctx.quadraticCurveTo(a.x, a.y - a.w, (a.x + b.x) / 2, (a.y + b.y) / 2 - (a.w + b.w) / 2);
  }
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i], b = pts[i - 1];
    ctx.quadraticCurveTo(a.x, a.y + a.w, (a.x + b.x) / 2, (a.y + b.y) / 2 + (a.w + b.w) / 2);
  }
  ctx.closePath();
  const gr = ctx.createLinearGradient(-tailLen, 0, 0, 0);
  gr.addColorStop(0, shade(color, -50));
  gr.addColorStop(1, color);
  ctx.fillStyle = gr;
  ctx.fill();

  // thin bright centre-line for a "wet"/glossy read
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 3; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = "rgba(255,255,255,0.30)";
  ctx.lineWidth = Math.max(0.6, r * 0.07);
  ctx.lineCap = "round";
  ctx.stroke();
}

/* ══════════════════════════════════════════════════════════════ */
/*  HEAD                                                          */
/* ══════════════════════════════════════════════════════════════ */
function drawHead(ctx: CanvasRenderingContext2D, r: number, color: string, hitFlash: number): void {
  // outer glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.1);
  glow.addColorStop(0, "rgba(0,0,0,0)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.9, r * 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.16;
  ctx.filter = "blur(2px)";
  ctx.fill();
  ctx.restore();
  void glow;

  // The head: an egg/oval shape, wider at the FRONT, tapering to the tail.
  // Drawn as a bezier blob rather than a plain ellipse so it reads "sperm".
  ctx.beginPath();
  ctx.moveTo(r * 1.02, 0);                                  // nose (front)
  ctx.bezierCurveTo(r * 1.02, -r * 0.86, r * 0.30, -r * 1.02, -r * 0.28, -r * 0.80);
  ctx.bezierCurveTo(-r * 0.82, -r * 0.62, -r * 0.96, -r * 0.22, -r * 0.96, 0);
  ctx.bezierCurveTo(-r * 0.96, r * 0.22, -r * 0.82, r * 0.62, -r * 0.28, r * 0.80);
  ctx.bezierCurveTo(r * 0.30, r * 1.02, r * 1.02, r * 0.86, r * 1.02, 0);
  ctx.closePath();

  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.35, r * 0.05, r * 0.1, r * 0.1, r * 1.5);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.28, shade(color, 70));
  g.addColorStop(0.72, color);
  g.addColorStop(1, shade(color, -55));
  ctx.fillStyle = g;
  ctx.fill();

  // rim light
  ctx.strokeStyle = shade(color, -80);
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.stroke();

  // glossy top highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.18, -r * 0.42, r * 0.42, r * 0.24, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();

  // small secondary sparkle
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.5, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();

  // hit flash
  if (hitFlash > 0) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,60,60,${Math.min(0.75, hitFlash)})`;
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  FACE                                                          */
/* ══════════════════════════════════════════════════════════════ */
function drawFace(
  ctx: CanvasRenderingContext2D,
  r: number,
  expression: Expression,
  time: number,
  seed: number
): void {
  // Eyes sit toward the front of the head. Rotate them upright-ish so the
  // face stays readable no matter which way the body points.
  const eyeY = r * 0.30;
  const eyeX = r * 0.34;
  const eyeR = r * 0.30;

  // blink every ~3s, staggered per character
  const blinkPhase = (time * 0.001 + seed * 1.7) % 3.4;
  const blinking = blinkPhase < 0.13;

  const drawEye = (ox: number, oy: number) => {
    if (expression === "dead") {
      // X eyes
      ctx.strokeStyle = "#1a0b26";
      ctx.lineWidth = Math.max(1.2, r * 0.13);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ox - eyeR * 0.6, oy - eyeR * 0.6);
      ctx.lineTo(ox + eyeR * 0.6, oy + eyeR * 0.6);
      ctx.moveTo(ox + eyeR * 0.6, oy - eyeR * 0.6);
      ctx.lineTo(ox - eyeR * 0.6, oy + eyeR * 0.6);
      ctx.stroke();
      return;
    }

    if (blinking) {
      ctx.strokeStyle = "#1a0b26";
      ctx.lineWidth = Math.max(1.2, r * 0.12);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ox - eyeR * 0.7, oy);
      ctx.lineTo(ox + eyeR * 0.7, oy);
      ctx.stroke();
      return;
    }

    // sclera
    ctx.beginPath();
    ctx.ellipse(ox, oy, eyeR, eyeR * (expression === "wow" ? 1.15 : 1.0), 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(26,11,38,0.55)";
    ctx.lineWidth = Math.max(0.7, r * 0.05);
    ctx.stroke();

    // pupil — drifts slightly forward so they look where they're going
    const look = expression === "hurt" ? -0.2 : 0.28;
    const px = ox + eyeR * look;
    const py = oy + Math.sin(time * 0.002 + seed) * eyeR * 0.08;
    const pr = eyeR * (expression === "angry" ? 0.46 : expression === "wow" ? 0.62 : 0.54);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = "#12061c";
    ctx.fill();
    // catch-light
    ctx.beginPath();
    ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
  };

  drawEye(eyeX, -eyeY);
  drawEye(eyeX, eyeY);

  // eyebrows for attitude
  if (expression === "angry" || expression === "determined") {
    ctx.strokeStyle = "#1a0b26";
    ctx.lineWidth = Math.max(1.2, r * 0.12);
    ctx.lineCap = "round";
    const tilt = expression === "angry" ? 0.38 : 0.2;
    ctx.beginPath();
    ctx.moveTo(eyeX - eyeR * 0.8, -eyeY - eyeR * 0.85);
    ctx.lineTo(eyeX + eyeR * 0.85, -eyeY - eyeR * (0.85 + tilt));
    ctx.moveTo(eyeX - eyeR * 0.8, eyeY + eyeR * 0.85);
    ctx.lineTo(eyeX + eyeR * 0.85, eyeY + eyeR * (0.85 + tilt));
    ctx.stroke();
  }

  // mouth — sits at the nose end
  const mx = r * 0.74;
  ctx.strokeStyle = "#1a0b26";
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineCap = "round";
  ctx.beginPath();
  switch (expression) {
    case "happy":
      ctx.arc(mx * 0.82, 0, r * 0.26, -1.0, 1.0);
      break;
    case "angry":
      ctx.arc(mx * 0.95, 0, r * 0.24, 2.2, 4.1);
      break;
    case "hurt":
      ctx.arc(mx * 0.9, 0, r * 0.18, 2.3, 4.0);
      break;
    case "wow": {
      ctx.ellipse(mx * 0.85, 0, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#3d1030";
      ctx.fill();
      break;
    }
    case "dead":
      ctx.moveTo(mx * 0.85, -r * 0.16);
      ctx.lineTo(mx * 0.85, r * 0.16);
      break;
    case "determined":
      ctx.moveTo(mx * 0.85, -r * 0.2);
      ctx.lineTo(mx * 0.85, r * 0.2);
      break;
    default:
      ctx.arc(mx * 0.85, 0, r * 0.2, -0.7, 0.7);
  }
  if (expression !== "wow") ctx.stroke();
}

/* ══════════════════════════════════════════════════════════════ */
/*  ACCESSORIES — what makes each character unique                */
/* ══════════════════════════════════════════════════════════════ */
function drawAccessory(
  ctx: CanvasRenderingContext2D,
  r: number,
  kind: AccessoryKind,
  color: string,
  time: number,
  seed: number
): void {
  switch (kind) {
    /* 🚀 SPACE — glass astronaut dome + antenna */
    case "helmet": {
      ctx.beginPath();
      ctx.ellipse(r * 0.1, 0, r * 1.28, r * 1.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(170,235,255,0.18)";
      ctx.fill();
      ctx.strokeStyle = "rgba(190,245,255,0.85)";
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.stroke();
      // dome sheen
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, -r * 0.5, r * 0.42, r * 0.2, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
      // helmet antenna with blinking light
      ctx.strokeStyle = "#cfd8e3";
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 1.02);
      ctx.lineTo(-r * 0.55, -r * 1.5);
      ctx.stroke();
      const blink = 0.5 + Math.sin(time * 0.006 + seed) * 0.5;
      ctx.beginPath();
      ctx.arc(-r * 0.55, -r * 1.55, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,80,80,${0.45 + blink * 0.55})`;
      ctx.fill();
      break;
    }

    /* 🏛️ POLITICIAN — collar + red power tie */
    case "tie": {
      // suit collar wrapping the back of the head
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, -r * 0.92);
      ctx.lineTo(-r * 0.95, -r * 0.5);
      ctx.lineTo(-r * 0.95, r * 0.5);
      ctx.lineTo(-r * 0.15, r * 0.92);
      ctx.closePath();
      ctx.fillStyle = "#22283a";
      ctx.fill();
      ctx.strokeStyle = "#101420";
      ctx.lineWidth = Math.max(0.8, r * 0.06);
      ctx.stroke();
      // white shirt V
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.42);
      ctx.lineTo(-r * 0.72, 0);
      ctx.lineTo(-r * 0.3, r * 0.42);
      ctx.closePath();
      ctx.fillStyle = "#f2f4f8";
      ctx.fill();
      // red tie
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.16);
      ctx.lineTo(-r * 0.42, r * 0.16);
      ctx.lineTo(-r * 1.22, r * 0.3);
      ctx.lineTo(-r * 1.22, -r * 0.3);
      ctx.closePath();
      ctx.fillStyle = "#d32b3a";
      ctx.fill();
      ctx.strokeStyle = "#8e1220";
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      ctx.stroke();
      break;
    }

    /* 🤖 AI — antenna + circuit visor */
    case "antenna": {
      ctx.strokeStyle = "#8ef7b0";
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.lineTo(r * 0.05, -r * 1.55);
      ctx.stroke();
      const pulse = 0.5 + Math.sin(time * 0.01 + seed) * 0.5;
      ctx.beginPath();
      ctx.arc(r * 0.05, -r * 1.62, r * 0.2 * (0.8 + pulse * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,255,160,${0.55 + pulse * 0.45})`;
      ctx.fill();
      // scanline visor across the eyes
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.roundRect?.(r * 0.02, -r * 0.66, r * 0.78, r * 1.32, r * 0.2);
      if (!ctx.roundRect) ctx.rect(r * 0.02, -r * 0.66, r * 0.78, r * 1.32);
      ctx.fillStyle = "rgba(20,60,40,0.55)";
      ctx.fill();
      ctx.strokeStyle = "#8ef7b0";
      ctx.lineWidth = Math.max(0.7, r * 0.06);
      ctx.stroke();
      // moving scan line
      const sy = -r * 0.6 + ((time * 0.06 + seed * 40) % (r * 1.2));
      ctx.beginPath();
      ctx.moveTo(r * 0.06, sy);
      ctx.lineTo(r * 0.76, sy);
      ctx.strokeStyle = "rgba(160,255,190,0.9)";
      ctx.lineWidth = Math.max(0.6, r * 0.07);
      ctx.stroke();
      ctx.restore();
      break;
    }

    /* 💰 CRYPTO — gold chain + black shades */
    case "shades": {
      // gold chain around the "neck"
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.beginPath();
      ctx.arc(-r * 0.45, 0, r * 0.62, -1.15, 1.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.98, 0, r * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();

      // shades: two lenses + bridge, covering the eyes
      const lens = (oy: number) => {
        ctx.beginPath();
        ctx.ellipse(r * 0.36, oy, r * 0.38, r * 0.3, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d12";
        ctx.fill();
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = Math.max(0.8, r * 0.07);
        ctx.stroke();
        // glint
        ctx.beginPath();
        ctx.moveTo(r * 0.2, oy + r * 0.12);
        ctx.lineTo(r * 0.46, oy - r * 0.14);
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = Math.max(0.6, r * 0.06);
        ctx.stroke();
      };
      lens(-r * 0.3);
      lens(r * 0.3);
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.06);
      ctx.lineTo(r * 0.4, r * 0.06);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = Math.max(0.8, r * 0.08);
      ctx.stroke();
      break;
    }

    /* 🧪 SCIENTIST — lab goggles pushed up + wild hair tufts */
    case "goggles": {
      // hair tufts
      ctx.fillStyle = "#e8e8f0";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.1 + i * r * 0.3, -r * 0.85);
        ctx.quadraticCurveTo(
          -r * 0.2 + i * r * 0.34, -r * 1.5 - Math.abs(i) * r * 0.1,
          -r * 0.5 + i * r * 0.38, -r * 1.12
        );
        ctx.closePath();
        ctx.fill();
      }
      // goggle strap
      ctx.strokeStyle = "#4a3b2a";
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.98, -1.35, -0.35);
      ctx.stroke();
      // two lenses on the forehead
      const gl = (oy: number) => {
        ctx.beginPath();
        ctx.arc(r * 0.28, oy, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,255,220,0.4)";
        ctx.fill();
        ctx.strokeStyle = "#c9a227";
        ctx.lineWidth = Math.max(0.8, r * 0.09);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.2, oy - r * 0.1, r * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
      };
      gl(-r * 0.58);
      gl(r * 0.58);
      break;
    }

    /* 🃏 CHAOS — three-point jester hat with bells */
    case "jester": {
      const bob = Math.sin(time * 0.006 + seed) * r * 0.12;
      const points = [
        { a: -1.45, l: 1.5, c: "#ff1493" },
        { a: -0.85, l: 1.35, c: "#8b5cf6" },
        { a: -2.05, l: 1.35, c: "#ffd700" },
      ];
      for (const p of points) {
        const ex = Math.cos(p.a) * r * p.l;
        const ey = Math.sin(p.a) * r * p.l + bob;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.5);
        ctx.quadraticCurveTo(ex * 0.5, ey * 0.9, ex, ey);
        ctx.lineTo(ex * 0.55, ey * 0.55);
        ctx.closePath();
        ctx.fillStyle = p.c;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.17, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd700";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = Math.max(0.5, r * 0.04);
        ctx.stroke();
      }
      // hat band
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.62, r * 0.85, r * 0.3, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = "#2a1040";
      ctx.fill();
      break;
    }


    /* 🏛️ PRIME SWIMMER — ceremonial sash across the body */
    case "sash": {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, -r * 0.95);
      ctx.lineTo(r * 0.35, -r * 0.55);
      ctx.lineTo(-r * 0.55, r * 0.95);
      ctx.lineTo(-r * 0.95, r * 0.45);
      ctx.closePath();
      const sg = ctx.createLinearGradient(-r, -r, r, r);
      sg.addColorStop(0, "#ff9933");
      sg.addColorStop(0.5, "#ffffff");
      sg.addColorStop(1, "#138808");
      ctx.fillStyle = sg;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      ctx.stroke();
      // medal
      ctx.beginPath();
      ctx.arc(-r * 0.5, r * 0.5, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.stroke();
      ctx.restore();
      break;
    }

    /* ☂️ THE RIGHT HONOURABLE — bowler hat + brolly */
    case "bowler": {
      // brim
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.82, r * 1.05, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1c1c24";
      ctx.fill();
      // dome
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.05, r * 0.6, r * 0.42, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = "#26262f";
      ctx.fill();
      ctx.strokeStyle = "#0d0d12";
      ctx.lineWidth = Math.max(0.5, r * 0.05);
      ctx.stroke();
      // hat band
      ctx.fillStyle = "#4a6fa5";
      ctx.fillRect(-r * 0.6, -r * 0.9, r * 1.2, r * 0.12);
      // umbrella handle behind
      ctx.strokeStyle = "#6b4423";
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, r * 0.2);
      ctx.lineTo(-r * 1.5, r * 0.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 1.55, r * 0.9, r * 0.16, Math.PI * 1.1, Math.PI * 2.2);
      ctx.stroke();
      break;
    }

    /* 🟠 BITCOIN MAXI — orange coin medallion */
    case "btccoin": {
      // chain
      ctx.strokeStyle = "#d4a017";
      ctx.lineWidth = Math.max(1, r * 0.11);
      ctx.beginPath();
      ctx.arc(-r * 0.4, 0, r * 0.6, -1.1, 1.1);
      ctx.stroke();
      // coin
      const cx = -r * 0.95, cy = 0, cr = r * 0.42;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      const cg = ctx.createRadialGradient(cx - cr * 0.3, cy - cr * 0.3, cr * 0.1, cx, cy, cr);
      cg.addColorStop(0, "#ffc65c");
      cg.addColorStop(1, "#f7931a");
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = "#b86f0d";
      ctx.lineWidth = Math.max(0.6, r * 0.06);
      ctx.stroke();
      // ₿ glyph
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${cr * 1.25}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u20BF", cx, cy + cr * 0.04);
      ctx.textBaseline = "alphabetic";
      break;
    }

    /* 🧠 BLOCKCHAIN BUILDER — hard hat */
    case "hardhat": {
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.72, r * 1.02, r * 0.17, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e8b400";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.86, r * 0.72, r * 0.55, 0, Math.PI, Math.PI * 2);
      const hg = ctx.createLinearGradient(-r * 0.7, -r * 1.4, r * 0.7, -r * 0.7);
      hg.addColorStop(0, "#ffd83d");
      hg.addColorStop(1, "#d19a00");
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.strokeStyle = "#9c7300";
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      ctx.stroke();
      // ridge
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4);
      ctx.lineTo(0, -r * 0.86);
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = Math.max(0.8, r * 0.08);
      ctx.stroke();
      break;
    }

    /* 🟣 MONAD MAXI — flagship: purple energy halo + orbiting diamond */
    case "monadhalo": {
      const spin = time * 0.0016 + seed;
      // outer halo ring
      ctx.save();
      ctx.translate(0, 0);
      ctx.rotate(spin);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.05, r * 1.55, r * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(131,110,249,.85)";
      ctx.lineWidth = Math.max(1.2, r * 0.11);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.05, r * 1.55, r * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196,181,253,.45)";
      ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.stroke();
      ctx.restore();

      // orbiting Monad diamond (the brand mark, kept in proportion)
      const ox = Math.cos(spin * 1.6) * r * 1.35;
      const oy = -r * 0.05 + Math.sin(spin * 1.6) * r * 0.42;
      const d = r * 0.3;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(spin * 2);
      ctx.beginPath();
      ctx.moveTo(0, -d); ctx.lineTo(d, 0); ctx.lineTo(0, d); ctx.lineTo(-d, 0);
      ctx.closePath();
      ctx.fillStyle = "#836ef9";
      ctx.fill();
      ctx.beginPath();
      const di = d * 0.45;
      ctx.moveTo(0, -di); ctx.lineTo(di, 0); ctx.lineTo(0, di); ctx.lineTo(-di, 0);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // energy sparks around the head
      for (let i = 0; i < 5; i++) {
        const a = spin * 2.4 + (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, r * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${0.45 + Math.sin(time * 0.006 + i) * 0.35})`;
        ctx.fill();
      }
      break;
    }

    /* 🎤 POP STAR — microphone + earpiece */
    case "mic": {
      ctx.save();
      ctx.translate(r * 0.9, r * 0.5);
      ctx.rotate(-0.5);
      // stick
      ctx.fillStyle = "#2b2b35";
      ctx.fillRect(-r * 0.07, 0, r * 0.14, r * 0.75);
      // head
      ctx.beginPath();
      ctx.arc(0, -r * 0.06, r * 0.26, 0, Math.PI * 2);
      const mg = ctx.createRadialGradient(-r * 0.08, -r * 0.14, r * 0.04, 0, -r * 0.06, r * 0.26);
      mg.addColorStop(0, "#e8e8f0");
      mg.addColorStop(1, "#8f8fa5");
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.strokeStyle = "#4a4a58";
      ctx.lineWidth = Math.max(0.5, r * 0.04);
      ctx.stroke();
      ctx.restore();
      // earpiece
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.72, r * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4fa3";
      ctx.fill();
      break;
    }

    /* ⚽ FOOTBALL LEGEND — sport headband */
    case "headband": {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 1.02, r * 0.3, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.strokeStyle = "#5cff8f";
      ctx.lineWidth = Math.max(1.4, r * 0.2);
      ctx.lineCap = "round";
      ctx.stroke();
      // stripe
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 1.02, r * 0.3, 0, Math.PI * 1.35, Math.PI * 1.62);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(0.7, r * 0.09);
      ctx.stroke();
      ctx.restore();
      break;
    }

    /* 🎮 GAMER — headset with boom mic */
    case "headset": {
      // band
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 1.08, Math.PI * 1.12, Math.PI * 1.88);
      ctx.strokeStyle = "#2f2f3d";
      ctx.lineWidth = Math.max(1.2, r * 0.15);
      ctx.lineCap = "round";
      ctx.stroke();
      // ear cups
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.98, -r * 0.05, r * 0.2, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#3a3a4a";
        ctx.fill();
        ctx.strokeStyle = "#b388ff";
        ctx.lineWidth = Math.max(0.6, r * 0.06);
        ctx.stroke();
      }
      // boom mic
      ctx.beginPath();
      ctx.moveTo(r * 0.92, r * 0.14);
      ctx.quadraticCurveTo(r * 1.25, r * 0.55, r * 0.72, r * 0.66);
      ctx.strokeStyle = "#2f2f3d";
      ctx.lineWidth = Math.max(0.7, r * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.7, r * 0.68, r * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = "#b388ff";
      ctx.fill();
      break;
    }

    /* 💻 TECH BRO — hoodie hood */
    case "hoodie": {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.9);
      ctx.quadraticCurveTo(-r * 1.35, -r * 1.15, -r * 1.15, r * 0.25);
      ctx.quadraticCurveTo(-r * 0.75, r * 0.9, -r * 0.15, r * 0.92);
      ctx.quadraticCurveTo(-r * 0.62, r * 0.1, r * 0.1, -r * 0.9);
      ctx.closePath();
      const hg = ctx.createLinearGradient(-r, -r, 0, r);
      hg.addColorStop(0, "#3f3f52");
      hg.addColorStop(1, "#23232f");
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.strokeStyle = "#15151d";
      ctx.lineWidth = Math.max(0.6, r * 0.05);
      ctx.stroke();
      // drawstring
      ctx.beginPath();
      ctx.arc(-r * 0.5, r * 0.72, r * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = "#7ae0ff";
      ctx.fill();
      break;
    }

    /* 🎬 MOVIE STAR — star-shaped sunglasses */
    case "starshades": {
      const lens = (oy: number) => {
        ctx.beginPath();
        ctx.ellipse(r * 0.36, oy, r * 0.36, r * 0.29, -0.08, 0, Math.PI * 2);
        ctx.fillStyle = "#14141c";
        ctx.fill();
        ctx.strokeStyle = "#e0aaff";
        ctx.lineWidth = Math.max(0.7, r * 0.07);
        ctx.stroke();
        // star glint
        ctx.save();
        ctx.translate(r * 0.28, oy - r * 0.05);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const rr = i % 2 === 0 ? r * 0.13 : r * 0.05;
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.fill();
        ctx.restore();
      };
      lens(-r * 0.3);
      lens(r * 0.3);
      ctx.beginPath();
      ctx.moveTo(r * 0.4, -r * 0.05);
      ctx.lineTo(r * 0.4, r * 0.05);
      ctx.strokeStyle = "#e0aaff";
      ctx.lineWidth = Math.max(0.8, r * 0.08);
      ctx.stroke();
      break;
    }

    case "none":
    default:
      break;
  }
}

/* ══════════════════════════════════════════════════════════════ */
/*  ROCKET FLAME (boost)                                          */
/* ══════════════════════════════════════════════════════════════ */
function drawFlame(ctx: CanvasRenderingContext2D, r: number, time: number, seed: number): void {
  const flick = 0.75 + Math.sin(time * 0.04 + seed * 3) * 0.25;
  const len = r * 3.4 * flick;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // outer orange
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.8 - len * 0.6, 0, -r * 0.8 - len, 0);
  ctx.quadraticCurveTo(-r * 0.8 - len * 0.6, 0, -r * 0.8, r * 0.5);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,120,20,0.55)";
  ctx.fill();

  // inner yellow
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.28);
  ctx.quadraticCurveTo(-r * 0.8 - len * 0.4, 0, -r * 0.8 - len * 0.62, 0);
  ctx.quadraticCurveTo(-r * 0.8 - len * 0.4, 0, -r * 0.8, r * 0.28);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,225,120,0.8)";
  ctx.fill();

  // white core
  ctx.beginPath();
  ctx.ellipse(-r * 1.05, 0, len * 0.14, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════ */
/*  Convenience: draw a sperm from a character id                 */
/* ══════════════════════════════════════════════════════════════ */
export function drawSpermByCharacter(
  ctx: CanvasRenderingContext2D,
  characterId: string,
  opts: Omit<SpermDrawOptions, "accessory">
): void {
  drawSperm(ctx, { ...opts, accessory: ACCESSORY_BY_CHARACTER[characterId] ?? "none" });
}
