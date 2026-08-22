/**
 * SPERM DASH — original side-scrolling endless swimmer.
 * The player swims right through a microscopic canal, dodging biological
 * hazards, collecting MON, grabbing power-ups and surviving boss sequences
 * until the giant Monad egg appears.
 *
 * Fully deterministic-per-frame simulation, no rendering here.
 */

export const DASH_W = 1280;          // virtual viewport width
export const DASH_H = 620;           // virtual viewport height
export const FLOOR_Y = DASH_H - 70;  // canal floor
export const CEIL_Y = 70;            // canal ceiling
export const PLAYER_X = 260;         // fixed horizontal screen position
export const EGG_DISTANCE = 1000;    // metres until the egg appears

export type ObstacleKind =
  | "immune"      // 🦠 big drifting immune cell
  | "dnaBar"      // 🧬 vertical DNA barrier w/ gap
  | "fragment"    // 🪨 cell fragment chunk
  | "vortex"      // 🌀 pulls the player in
  | "electric"    // ⚡ electric barrier, blinks on/off
  | "bubble"      // 🫧 bubble trap, slows you
  | "toxic"       // ☠️ toxic zone
  | "mover";      // 🔴 vertically oscillating cell

export type PowerKind = "turbo" | "shield" | "mutation" | "magnet" | "rocket";

export type BossKind = "chase" | "tunnel" | "surge" | "final" | null;

export interface DashObstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** oscillation */
  baseY: number;
  amp: number;
  freq: number;
  phase: number;
  /** electric on/off */
  active: boolean;
  hp: number;
  spin: number;
}

export interface DashMon {
  id: number;
  x: number;
  y: number;
  r: number;
  taken: boolean;
  phase: number;
  /** magnet pull velocity */
  vx: number;
  vy: number;
}

export interface DashPower {
  id: number;
  kind: PowerKind;
  x: number;
  y: number;
  r: number;
  phase: number;
  taken: boolean;
}

export interface DashParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  kind: "dot" | "spark" | "ring" | "text" | "bubble";
  text?: string;
}

export interface DashState {
  // player
  px: number;          // world x (metres * SCALE)
  py: number;
  vy: number;
  alive: boolean;
  invuln: number;      // seconds of i-frames
  hitFlash: number;

  // run stats
  distance: number;    // metres
  score: number;
  mon: number;
  combo: number;
  comboTimer: number;
  bestCombo: number;

  // speed
  speed: number;       // px/sec world scroll
  targetSpeed: number;
  speedMult: number;

  // power-ups (seconds remaining)
  turbo: number;
  shield: number;
  mutation: number;
  magnet: number;
  rocket: number;
  mutationKind: PowerKind | null;

  // world
  obstacles: DashObstacle[];
  mons: DashMon[];
  powers: DashPower[];
  particles: DashParticle[];

  // generation
  nextSpawnX: number;
  patternCooldown: number;

  // boss
  boss: BossKind;
  bossTimer: number;
  bossX: number;       // chaser screen x
  bossWarned: boolean;
  nextBossAt: number;
  tunnelNextX: number;

  // presentation
  shake: number;
  flash: number;
  camY: number;
  camZoom: number;
  announcement: string | null;
  announceUntil: number;
  phase: "ready" | "playing" | "eggIntro" | "dead" | "won";
  eggProgress: number; // 0..1 during final approach
  time: number;        // seconds elapsed
}

const GRAVITY = 1320;
const SWIM_IMPULSE = -500;
const DIVE_FORCE = 2100;
const MAX_VY = 1000;
const BASE_SPEED = 330;
const PLAYER_R = 20;

let idc = 1;
const nid = () => idc++;

export function createDashState(): DashState {
  return {
    px: 0, py: DASH_H / 2, vy: 0, alive: true, invuln: 1.2, hitFlash: 0,
    distance: 0, score: 0, mon: 0, combo: 0, comboTimer: 0, bestCombo: 0,
    speed: BASE_SPEED, targetSpeed: BASE_SPEED, speedMult: 1,
    turbo: 0, shield: 0, mutation: 0, magnet: 0, rocket: 0, mutationKind: null,
    obstacles: [], mons: [], powers: [], particles: [],
    nextSpawnX: DASH_W + 900, patternCooldown: 0,
    boss: null, bossTimer: 0, bossX: -400, bossWarned: false, nextBossAt: 400, tunnelNextX: 0,
    shake: 0, flash: 0, camY: 0, camZoom: 1,
    announcement: null, announceUntil: 0,
    phase: "ready", eggProgress: 0, time: 0,
  };
}

export interface DashInput {
  up: boolean;      // space / click / W / ArrowUp
  down: boolean;    // S / ArrowDown
  boost: boolean;   // Shift
  upPressed: boolean; // edge trigger for the swim flap
}

export interface DashEvents {
  onCoin?: () => void;
  onHit?: () => void;
  onPower?: (k: PowerKind) => void;
  onBoss?: (k: BossKind) => void;
  onDeath?: () => void;
  onWin?: () => void;
  onCombo?: (n: number) => void;
  onBoost?: () => void;
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PARTICLES                                                         */
/* ══════════════════════════════════════════════════════════════════ */
export function dashParticle(
  s: DashState, x: number, y: number, vx: number, vy: number,
  life: number, color: string, size: number,
  kind: DashParticle["kind"] = "dot", text?: string
): void {
  if (s.particles.length > 420) return;
  s.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, kind, text });
}

function burst(s: DashState, x: number, y: number, n: number, color: string, power = 1): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const sp = (90 + Math.random() * 190) * power;
    dashParticle(s, x, y, Math.cos(a) * sp, Math.sin(a) * sp,
      0.35 + Math.random() * 0.35, color, 2 + Math.random() * 4, "spark");
  }
}

/* ══════════════════════════════════════════════════════════════════ */
/*  PROCEDURAL PATTERNS                                               */
/* ══════════════════════════════════════════════════════════════════ */
type PatternFn = (s: DashState, x: number, diff: number) => number;

function laneY(i: number, lanes = 5): number {
  const top = CEIL_Y + 60;
  const bot = FLOOR_Y - 60;
  return top + ((bot - top) / (lanes - 1)) * i;
}

function addObstacle(
  s: DashState, kind: ObstacleKind, x: number, y: number, w: number, h: number,
  opt: Partial<DashObstacle> = {}
): void {
  s.obstacles.push({
    id: nid(), kind, x, y, w, h,
    baseY: y, amp: 0, freq: 1, phase: Math.random() * 6.28,
    active: true, hp: 1, spin: 0, ...opt,
  });
}

function addMon(s: DashState, x: number, y: number): void {
  s.mons.push({ id: nid(), x, y, r: 11, taken: false, phase: Math.random() * 6.28, vx: 0, vy: 0 });
}

function addPower(s: DashState, x: number, y: number, kind: PowerKind): void {
  s.powers.push({ id: nid(), kind, x, y, r: 18, phase: Math.random() * 6.28, taken: false });
}

/** A: MON arc over a low fragment field */
const patA: PatternFn = (s, x, diff) => {
  const n = 2 + Math.floor(diff * 2);
  for (let i = 0; i < n; i++) {
    addObstacle(s, "fragment", x + i * 210, FLOOR_Y - 40, 46, 40);
  }
  for (let i = 0; i < n * 2; i++) {
    const t = i / (n * 2 - 1);
    addMon(s, x + 60 + t * (n * 210 - 120), FLOOR_Y - 150 - Math.sin(t * Math.PI) * 130);
  }
  return n * 210 + 200;
};

/** B: alternating high/low immune cells — weave up and down */
const patB: PatternFn = (s, x, diff) => {
  const n = 2 + Math.floor(diff * 2);
  for (let i = 0; i < n; i++) {
    const top = i % 2 === 0;
    const r = 40 + Math.random() * 22;
    addObstacle(s, "immune", x + i * 260, top ? CEIL_Y + r : FLOOR_Y - r, r * 2, r * 2, {
      amp: 12 + diff * 16, freq: 1.2, spin: (Math.random() - 0.5) * 2,
    });
    addMon(s, x + i * 260 + 130, top ? FLOOR_Y - 90 : CEIL_Y + 90);
  }
  return n * 260 + 220;
};

/** C: DNA barrier with a gap you must line up with */
const patC: PatternFn = (s, x, diff) => {
  const n = 1 + Math.floor(diff * 1.8);
  for (let i = 0; i < n; i++) {
    const gapLane = 1 + Math.floor(Math.random() * 3);
    const gapY = laneY(gapLane);
    const gapH = 215 - diff * 45;
    const gx = x + i * 300;
    // upper bar
    addObstacle(s, "dnaBar", gx, CEIL_Y, 26, Math.max(0, gapY - gapH / 2 - CEIL_Y));
    // lower bar
    const lowTop = gapY + gapH / 2;
    addObstacle(s, "dnaBar", gx, lowTop, 26, Math.max(0, FLOOR_Y - lowTop));
    addMon(s, gx + 14, gapY);
  }
  return n * 300 + 220;
};

/** D: vortex gauntlet */
const patD: PatternFn = (s, x, diff) => {
  const n = 2 + Math.floor(diff);
  for (let i = 0; i < n; i++) {
    addObstacle(s, "vortex", x + i * 340, laneY(1 + Math.floor(Math.random() * 3)), 110, 110, {
      amp: 26, freq: 0.7,
    });
  }
  for (let i = 0; i < 8; i++) addMon(s, x + 150 + i * 46, laneY(0) + Math.sin(i) * 20);
  return n * 340 + 240;
};

/** E: electric fences that blink */
const patE: PatternFn = (s, x, diff) => {
  const n = 2 + Math.floor(diff * 2);
  for (let i = 0; i < n; i++) {
    const fromTop = i % 2 === 0;
    const h = 150 + diff * 55;
    addObstacle(s, "electric", x + i * 300, fromTop ? CEIL_Y : FLOOR_Y - h, 18, h, {
      freq: 1.4 + Math.random() * 0.8, phase: Math.random() * 6.28,
    });
  }
  for (let i = 0; i < n; i++) addMon(s, x + 150 + i * 300, laneY(2));
  return n * 300 + 240;
};

/** F: moving cells column */
const patF: PatternFn = (s, x, diff) => {
  const n = 2 + Math.floor(diff * 2);
  for (let i = 0; i < n; i++) {
    addObstacle(s, "mover", x + i * 230, laneY(2), 54, 54, {
      amp: 90 + diff * 50, freq: 0.8 + Math.random() * 0.7,
    });
  }
  for (let i = 0; i < n; i++) addMon(s, x + 115 + i * 230, laneY(i % 2 === 0 ? 0 : 4));
  return n * 230 + 220;
};

/** G: toxic floor / ceiling run with a MON reward line */
const patG: PatternFn = (s, x, diff) => {
  const len = 380 + diff * 170;
  const onFloor = Math.random() > 0.5;
  addObstacle(s, "toxic", x, onFloor ? FLOOR_Y - 46 : CEIL_Y, len, 46);
  const n = Math.floor(len / 58);
  for (let i = 0; i < n; i++) {
    addMon(s, x + 40 + i * 58, onFloor ? CEIL_Y + 110 : FLOOR_Y - 110);
  }
  return len + 240;
};

/** H: bubble traps + safe MON pocket */
const patH: PatternFn = (s, x, diff) => {
  const n = 3 + Math.floor(diff * 2);
  for (let i = 0; i < n; i++) {
    addObstacle(s, "bubble", x + i * 190, laneY(Math.floor(Math.random() * 5)), 60, 60, {
      amp: 30, freq: 0.6,
    });
  }
  for (let i = 0; i < 6; i++) addMon(s, x + n * 190 + 60 + i * 44, laneY(2) + Math.sin(i * 0.9) * 60);
  return n * 190 + 420;
};

const PATTERNS: PatternFn[] = [patA, patB, patC, patD, patE, patF, patG, patH];

/* ══════════════════════════════════════════════════════════════════ */
/*  UPDATE                                                            */
/* ══════════════════════════════════════════════════════════════════ */
export function updateDash(s: DashState, dtMs: number, input: DashInput, ev: DashEvents = {}): void {
  if (s.phase === "ready" || s.phase === "dead" || s.phase === "won") {
    // still animate particles so the death screen looks alive
    stepParticles(s, dtMs / 1000);
    s.shake *= 0.9;
    return;
  }

  const dt = Math.min(dtMs, 50) / 1000;
  s.time += dt;

  /* ── difficulty ramps with distance ── */
  const diff = Math.min(1, Math.max(0, (s.distance - 120) / 1500));

  /* ── speed ── */
  s.targetSpeed = BASE_SPEED + diff * 210;
  if (s.turbo > 0) s.targetSpeed *= 1.55;
  if (s.rocket > 0) s.targetSpeed *= 1.9;
  if (s.boss === "surge") s.targetSpeed *= 1.7;
  if (s.boss === "chase") s.targetSpeed *= 1.25;
  if (input.boost && s.rocket <= 0 && s.turbo <= 0) s.targetSpeed *= 1.28;
  s.speed += (s.targetSpeed - s.speed) * Math.min(1, dt * 2.4);
  s.speedMult = s.speed / BASE_SPEED;

  /* ── player physics ── */
  if (input.upPressed) {
    s.vy = SWIM_IMPULSE * (s.rocket > 0 ? 1.2 : 1);
    for (let i = 0; i < 5; i++) {
      dashParticle(s, PLAYER_X - 16, s.py + 8, -80 - Math.random() * 120,
        40 + Math.random() * 90, 0.4, "#a78bfa", 2 + Math.random() * 3, "bubble");
    }
  } else if (input.up) {
    s.vy -= 760 * dt; // hold to keep rising gently
  }
  if (input.down) s.vy += DIVE_FORCE * dt;

  s.vy += GRAVITY * 0.55 * dt;         // gentle buoyant gravity (it's fluid!)
  s.vy = Math.max(-MAX_VY, Math.min(MAX_VY, s.vy));
  s.py += s.vy * dt;

  // canal bounds — bump, don't kill
  if (s.py < CEIL_Y + PLAYER_R) { s.py = CEIL_Y + PLAYER_R; s.vy = Math.max(0, s.vy) * 0.3; }
  if (s.py > FLOOR_Y - PLAYER_R) { s.py = FLOOR_Y - PLAYER_R; s.vy = Math.min(0, s.vy) * 0.3; }

  /* ── world scroll ── */
  const dx = s.speed * dt;
  s.px += dx;
  s.distance += dx / 12;   // 12px = 1 metre

  /* ── swim trail ── */
  if (Math.random() < 0.6) {
    dashParticle(s, PLAYER_X - 22, s.py + (Math.random() - 0.5) * 14,
      -s.speed * 0.35, (Math.random() - 0.5) * 40,
      0.45, s.rocket > 0 ? "#ff9d3c" : "#8b5cf6", 2 + Math.random() * 2.5, "bubble");
  }
  if (s.rocket > 0 || s.turbo > 0) {
    for (let i = 0; i < 2; i++) {
      dashParticle(s, PLAYER_X - 26, s.py + (Math.random() - 0.5) * 12,
        -s.speed * 0.7 - Math.random() * 200, (Math.random() - 0.5) * 70,
        0.3, s.rocket > 0 ? "#ffd166" : "#c4b5fd", 3 + Math.random() * 3, "spark");
    }
  }

  /* ── timers ── */
  const dec = (v: number) => Math.max(0, v - dt);
  s.turbo = dec(s.turbo);
  s.shield = dec(s.shield);
  s.mutation = dec(s.mutation);
  s.magnet = dec(s.magnet);
  s.rocket = dec(s.rocket);
  s.invuln = dec(s.invuln);
  if (s.mutation <= 0) s.mutationKind = null;
  s.hitFlash = Math.max(0, s.hitFlash - dt * 3);
  s.shake *= 0.88;
  s.flash = Math.max(0, s.flash - dt * 2.5);

  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 0;
  }

  /* ── score ── */
  s.score += dx * 0.55 * (1 + s.combo * 0.04);

  /* ── boss sequences ── */
  updateBoss(s, dt, diff, ev);

  /* ── egg / final approach ── */
  if (s.distance >= EGG_DISTANCE && s.phase === "playing") {
    s.phase = "eggIntro";
    s.announcement = "🥚 THE EGG IS IN SIGHT";
    s.announceUntil = s.time + 3;
    s.camZoom = 1;
    ev.onBoss?.("final");
  }
  if (s.phase === "eggIntro") {
    s.eggProgress = Math.min(1, (s.distance - EGG_DISTANCE) / 260);
    s.camZoom += ((1 + s.eggProgress * 0.35) - s.camZoom) * dt * 2;
    if (s.eggProgress >= 1) {
      s.phase = "won";
      s.flash = 1;
      s.shake = 22;
      burst(s, PLAYER_X + 60, s.py, 60, "#ffd700", 1.8);
      burst(s, PLAYER_X + 60, s.py, 40, "#ff7ad9", 1.5);
      ev.onWin?.();
      return;
    }
  }

  /* ── spawn world ── */
  if (s.boss !== "tunnel" && s.boss !== "final" && s.phase === "playing") {
    s.patternCooldown -= dt;
    while (s.px + DASH_W + 300 > s.nextSpawnX) {
      const spawnAt = s.nextSpawnX - s.px + PLAYER_X;
      const easy = [patA, patF, patH];              // gentle, readable openers
      const pool = s.distance < 260 ? easy : PATTERNS;
      const fn = pool[Math.floor(Math.random() * pool.length)];
      const width = fn(s, spawnAt + s.px, diff);
      // occasional power-up between patterns
      if (Math.random() < 0.55) {
        // shield weighted heavily — it is the player's safety net
        const kinds: PowerKind[] = ["shield", "shield", "shield", "magnet", "turbo", "mutation", "rocket"];
        const k = kinds[Math.floor(Math.random() * kinds.length)];
        addPower(s, s.nextSpawnX + width * 0.55, laneY(Math.floor(Math.random() * 5)), k);
      }
      const warmup = Math.max(0, 1 - s.distance / 300);   // 1 -> 0 over the first 300m
      const bossRelief = s.boss ? 300 : 0;                // bosses already add pressure
      s.nextSpawnX += width + Math.max(240, 480 - diff * 200) + warmup * 340 + bossRelief;
    }
  }

  /* ── update obstacles ── */
  for (let i = s.obstacles.length - 1; i >= 0; i--) {
    const o = s.obstacles[i];
    if (o.amp > 0) o.y = o.baseY + Math.sin(s.time * o.freq + o.phase) * o.amp;
    if (o.kind === "electric") {
      o.active = Math.sin(s.time * o.freq * 2.2 + o.phase) > 0.15;
    }
    if (o.kind === "vortex") {
      // pull the player toward the centre
      const sx = o.x - s.px + PLAYER_X;
      const ddx = sx - PLAYER_X;
      const ddy = (o.y) - s.py;
      const d = Math.hypot(ddx, ddy);
      if (d < 200 && d > 1) {
        const pull = (1 - d / 200) * 230;
        s.py += (ddy / d) * pull * dt;
        s.vy += (ddy / d) * pull * dt * 1.2;
      }
    }
    if (o.x - s.px + PLAYER_X < -400) s.obstacles.splice(i, 1);
  }

  /* ── magnet + MON collection ── */
  for (let i = s.mons.length - 1; i >= 0; i--) {
    const m = s.mons[i];
    const sx = m.x - s.px + PLAYER_X;
    if (sx < -120) { s.mons.splice(i, 1); continue; }
    if (m.taken) continue;
    m.phase += dt * 4;

    const pullR = s.magnet > 0 ? 320 : 58;
    const ddx = PLAYER_X - sx;
    const ddy = s.py - m.y;
    const d = Math.hypot(ddx, ddy);

    if (s.magnet > 0 && d < pullR) {
      const f = (1 - d / pullR) * 900;
      m.vx += (ddx / (d || 1)) * f * dt;
      m.vy += (ddy / (d || 1)) * f * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
    }

    if (d < PLAYER_R + m.r + 6) {
      m.taken = true;
      s.mon += 1;
      s.combo += 1;
      s.comboTimer = 2.2;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.score += 60 * (1 + s.combo * 0.12);
      burst(s, sx, m.y, 8, "#ffd700", 0.7);
      dashParticle(s, sx, m.y - 12, 0, -70, 0.7, "#ffd700", 14, "text", "+MON");
      if (s.combo > 0 && s.combo % 10 === 0) {
        dashParticle(s, PLAYER_X, s.py - 54, 0, -60, 1.1, "#ff7ad9", 20, "text", `COMBO x${s.combo}!`);
        burst(s, PLAYER_X, s.py, 22, "#ff7ad9", 1.2);
        ev.onCombo?.(s.combo);
      } else {
        ev.onCoin?.();
      }
      s.mons.splice(i, 1);
    }
  }

  /* ── power-ups ── */
  for (let i = s.powers.length - 1; i >= 0; i--) {
    const p = s.powers[i];
    const sx = p.x - s.px + PLAYER_X;
    if (sx < -120) { s.powers.splice(i, 1); continue; }
    p.phase += dt * 3;
    if (Math.hypot(PLAYER_X - sx, s.py - p.y) < PLAYER_R + p.r + 8) {
      applyPower(s, p.kind);
      burst(s, sx, p.y, 24, powerColor(p.kind), 1.3);
      dashParticle(s, sx, p.y - 22, 0, -70, 1.2, powerColor(p.kind), 17, "text", powerLabel(p.kind));
      s.flash = Math.max(s.flash, 0.45);
      ev.onPower?.(p.kind);
      s.powers.splice(i, 1);
    }
  }

  /* ── collisions ── */
  if (s.invuln <= 0) {
    for (const o of s.obstacles) {
      if (o.kind === "electric" && !o.active) continue;
      if (o.kind === "vortex") continue; // vortex pulls, doesn't damage
      const sx = o.x - s.px + PLAYER_X;
      let hit = false;
      if (o.kind === "immune" || o.kind === "mover" || o.kind === "bubble") {
        const r = o.w / 2;
        hit = Math.hypot(PLAYER_X - (sx + r), s.py - o.y) < PLAYER_R * 0.62 + r * 0.8;
      } else {
        hit = PLAYER_X + PLAYER_R * 0.55 > sx &&
              PLAYER_X - PLAYER_R * 0.55 < sx + o.w &&
              s.py + PLAYER_R * 0.55 > o.y &&
              s.py - PLAYER_R * 0.55 < o.y + o.h;
      }
      if (hit) {
        if (o.kind === "bubble") {
          // bubble = slow trap, not lethal
          s.speed *= 0.55;
          s.invuln = 0.5;
          burst(s, sx + o.w / 2, o.y, 12, "#9fdcff", 0.6);
          ev.onHit?.();
        } else {
          damage(s, sx, ev);
        }
        break;
      }
    }
  }

  /* ── chaser boss catches you ── */
  if (s.boss === "chase" && s.bossX > PLAYER_X - 40 && s.invuln <= 0) {
    damage(s, s.bossX, ev);
  }

  stepParticles(s, dt);
}

function damage(s: DashState, atX: number, ev: DashEvents): void {
  if (s.shield > 0) {
    s.shield = 0;
    s.invuln = 1.5;
    s.hitFlash = 0.6;
    s.shake = 14;
    burst(s, PLAYER_X, s.py, 26, "#7ae0ff", 1.3);
    dashParticle(s, PLAYER_X, s.py - 40, 0, -60, 1, "#7ae0ff", 16, "text", "SHIELD BROKE!");
    ev.onHit?.();
    return;
  }
  s.alive = false;
  s.phase = "dead";
  s.shake = 26;
  s.flash = 0.8;
  burst(s, PLAYER_X, s.py, 46, "#ff3b6b", 1.7);
  burst(s, PLAYER_X, s.py, 26, "#ffd166", 1.2);
  void atX;
  ev.onDeath?.();
}

function applyPower(s: DashState, k: PowerKind): void {
  switch (k) {
    case "turbo":    s.turbo = 6; break;
    case "shield":   s.shield = 12; break;
    case "magnet":   s.magnet = 8; break;
    case "rocket":   s.rocket = 4.5; break;
    case "mutation": {
      const pool: PowerKind[] = ["turbo", "shield", "magnet", "rocket"];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      s.mutation = 7;
      s.mutationKind = pick;
      applyPower(s, pick);
      break;
    }
  }
}

export function powerColor(k: PowerKind): string {
  return { turbo: "#ffd166", shield: "#7ae0ff", mutation: "#c77dff", magnet: "#ff7ad9", rocket: "#ff9d3c" }[k];
}
export function powerLabel(k: PowerKind): string {
  return { turbo: "TURBO!", shield: "SHIELD!", mutation: "MUTATION!", magnet: "MON MAGNET!", rocket: "ROCKET TAIL!" }[k];
}
export function powerIcon(k: PowerKind): string {
  return { turbo: "⚡", shield: "🛡️", mutation: "🧬", magnet: "🧲", rocket: "🚀" }[k];
}

/* ══════════════════════════════════════════════════════════════════ */
/*  BOSS SEQUENCES                                                    */
/* ══════════════════════════════════════════════════════════════════ */
function updateBoss(s: DashState, dt: number, diff: number, ev: DashEvents): void {
  if (s.boss) {
    s.bossTimer -= dt;

    if (s.boss === "chase") {
      // immune cell creeps closer, player must outrun it
      const target = PLAYER_X - 150 - Math.sin(s.time * 1.7) * 40;
      s.bossX += (target - s.bossX) * dt * 0.42;
      if (Math.random() < 0.5) {
        dashParticle(s, s.bossX, s.py + (Math.random() - 0.5) * 120,
          -120, (Math.random() - 0.5) * 90, 0.5, "#ff4d6d", 3 + Math.random() * 4, "spark");
      }
    }

    if (s.boss === "tunnel") {
      // A *coherent* corridor: wall pairs at fixed spacing, and the gap centre
      // is a smooth function of world-X so it forms one continuous readable
      // snake rather than random jitter.
      const SPACING = 300;
      const gap = 250 - diff * 40;
      while (s.px + DASH_W + 120 > s.tunnelNextX) {
        const x = s.tunnelNextX;
        const c = DASH_H / 2 + Math.sin(x * 0.0022) * 120 + Math.sin(x * 0.0009) * 45;
        addObstacle(s, "dnaBar", x, CEIL_Y, 22, Math.max(0, c - gap / 2 - CEIL_Y));
        addObstacle(s, "dnaBar", x, c + gap / 2, 22, Math.max(0, FLOOR_Y - (c + gap / 2)));
        addMon(s, x + 11, c);
        s.tunnelNextX += SPACING;
      }
    }

    if (s.boss === "surge") {
      if (Math.random() < dt * 14) {
        addMon(s, s.px + DASH_W + 40, laneY(Math.floor(Math.random() * 5)));
      }
      if (Math.random() < dt * 1.5) {
        addObstacle(s, "fragment", s.px + DASH_W + 40, laneY(Math.floor(Math.random() * 5)) - 22, 44, 44);
      }
    }

    if (s.bossTimer <= 0) {
      if (s.boss === "chase") {
        dashParticle(s, PLAYER_X, s.py - 60, 0, -60, 1.4, "#39ff14", 20, "text", "ESCAPED!");
        s.score += 900;
        burst(s, PLAYER_X, s.py, 26, "#39ff14", 1.2);
      }
      s.boss = null;
      s.bossX = -400;
      s.camZoom = 1;
      s.nextBossAt = s.distance + 340 + Math.random() * 240;
    }
    return;
  }

  // trigger a new boss?
  if (s.distance > s.nextBossAt && s.distance < EGG_DISTANCE - 200) {
    const kinds: Exclude<BossKind, null | "final">[] = ["chase", "tunnel", "surge"];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    s.boss = k;
    s.bossWarned = true;
    s.shake = 12;
    s.flash = 0.5;
    s.invuln = Math.max(s.invuln, 0.9);
    switch (k) {
      case "chase":
        s.bossTimer = 10;
        s.bossX = -260;
        s.announcement = "🦠 IMMUNE CELL CHASE — SURVIVE 10s";
        s.camZoom = 0.92;
        break;
      case "tunnel":
        s.bossTimer = 11;
        s.announcement = "🧬 DNA TUNNEL — FOLLOW THE GAP";
        // clear the road ahead so the tunnel is fair
        s.obstacles = s.obstacles.filter((o) => o.x - s.px < 260);
        s.nextSpawnX = s.px + DASH_W + 1400;
        s.tunnelNextX = s.px + DASH_W + 260;   // lead-in before the first wall
        break;
      case "surge":
        s.bossTimer = 8;
        s.announcement = "💜 MONAD SURGE — EVERYTHING ACCELERATES";
        break;
    }
    s.announceUntil = s.time + 3;
    ev.onBoss?.(k);
  }
}

function stepParticles(s: DashState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === "bubble") { p.vy -= 30 * dt; p.vx *= 0.98; }
    else if (p.kind === "spark") { p.vy += 220 * dt; p.vx *= 0.97; }
    p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
}

/* ══════════════════════════════════════════════════════════════════ */
export function dashRestart(s: DashState): void {
  const fresh = createDashState();
  Object.assign(s, fresh);
  s.phase = "playing";
}
