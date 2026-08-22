import {
  GameState, PlayerState, Particle, dist,
} from "./game-engine";
import { ARENA_SIZE, EGG_POS, EGG_RADIUS, CHARACTERS, getCharacterDef } from "./game-config";
import { drawSpermByCharacter, type Expression } from "./sperm-art";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
}

export function createCamera(): Camera {
  return { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2, zoom: 1, targetX: ARENA_SIZE / 2, targetY: ARENA_SIZE / 2 };
}

export function updateCamera(camera: Camera, target: { x: number; y: number }): void {
  camera.targetX = target.x;
  camera.targetY = target.y;
  camera.x += (camera.targetX - camera.x) * 0.08;
  camera.y += (camera.targetY - camera.y) * 0.08;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  camera: Camera,
  localPlayerId: string,
  time: number
): void {
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.fillStyle = "#0a0014";
  ctx.fillRect(0, 0, w, h);

  ctx.save();

  // Camera transform with shake
  const shakeX = state.shakeAmount * (Math.random() - 0.5) * 2;
  const shakeY = state.shakeAmount * (Math.random() - 0.5) * 2;
  const cx = w / 2 - camera.x * camera.zoom + shakeX;
  const cy = h / 2 - camera.y * camera.zoom + shakeY;
  ctx.translate(cx, cy);
  ctx.scale(camera.zoom, camera.zoom);

  // Draw arena background
  drawArenaBackground(ctx, time);

  // Draw grid
  drawGrid(ctx, camera, w, h);

  // Draw MON crystals
  drawMonCrystals(ctx, state, time);

  // Draw egg
  drawEgg(ctx, state, time);

  // Draw immune cells
  drawImmuneCells(ctx, state, time);

  // Draw players
  for (const player of state.players.values()) {
    if (player.alive) {
      drawPlayer(ctx, player, time, player.id === localPlayerId);
    }
  }

  // Draw particles
  drawParticles(ctx, state);

  // Monad Blast cinematic shockwave (world space)
  drawMonadBlast(ctx, state, time);

  // Draw arena border
  ctx.strokeStyle = "#8b5cf644";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, ARENA_SIZE, ARENA_SIZE);

  ctx.restore();

  // Draw HUD (screen space)
  drawHUD(ctx, canvas, state, localPlayerId, time);
}

function drawArenaBackground(ctx: CanvasRenderingContext2D, time: number): void {
  // Subtle gradient background
  const grad = ctx.createRadialGradient(ARENA_SIZE/2, ARENA_SIZE/2, 0, ARENA_SIZE/2, ARENA_SIZE/2, ARENA_SIZE * 0.7);
  grad.addColorStop(0, "#150028");
  grad.addColorStop(1, "#0a0014");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);

  // Floating cells (biological background)
  for (let i = 0; i < 20; i++) {
    const x = ((i * 317 + time * 0.02) % ARENA_SIZE);
    const y = ((i * 523 + time * 0.015) % ARENA_SIZE);
    const r = 15 + Math.sin(i + time * 0.001) * 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.04 + Math.sin(i + time * 0.002) * 0.02})`;
    ctx.fill();
  }

  // DNA strands
  for (let i = 0; i < 5; i++) {
    const baseX = i * 400 + 200;
    ctx.beginPath();
    for (let y = 0; y < ARENA_SIZE; y += 10) {
      const x = baseX + Math.sin(y * 0.01 + time * 0.002 + i) * 30;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(139, 92, 246, 0.06)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, w: number, h: number): void {
  const gridSize = 100;
  ctx.strokeStyle = "rgba(139, 92, 246, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA_SIZE; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_SIZE);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA_SIZE; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_SIZE, y);
    ctx.stroke();
  }
}

function drawMonCrystals(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  for (const crystal of state.monCrystals) {
    const pulse = 1 + Math.sin(crystal.pulsePhase + time * 0.005) * 0.2;
    const r = crystal.radius * pulse;

    // Glow
    ctx.beginPath();
    ctx.arc(crystal.pos.x, crystal.pos.y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
    ctx.fill();

    // Crystal body
    ctx.beginPath();
    ctx.arc(crystal.pos.x, crystal.pos.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(crystal.pos.x, crystal.pos.y, 0, crystal.pos.x, crystal.pos.y, r);
    grad.addColorStop(0, "#fff8dc");
    grad.addColorStop(0.5, "#ffd700");
    grad.addColorStop(1, "#ff8c00");
    ctx.fillStyle = grad;
    ctx.fill();

    // Sparkle
    ctx.beginPath();
    ctx.arc(crystal.pos.x, crystal.pos.y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();

    // MON label
    ctx.font = "8px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "center";
    ctx.fillText(`${crystal.value}`, crystal.pos.x, crystal.pos.y + r + 10);
  }
}

function drawEgg(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const pulse = 1 + Math.sin(time * 0.003) * 0.05;
  const urgency = Math.max(0, 1 - state.timeRemaining / 20);
  const glowSize = EGG_RADIUS * (2 + urgency + Math.sin(time * 0.005) * 0.3);

  // Outer glow
  const grad = ctx.createRadialGradient(EGG_POS.x, EGG_POS.y, 0, EGG_POS.x, EGG_POS.y, glowSize * 2);
  grad.addColorStop(0, `rgba(255, 200, 255, ${0.15 + urgency * 0.1})`);
  grad.addColorStop(0.5, `rgba(139, 92, 246, ${0.08 + urgency * 0.05})`);
  grad.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.beginPath();
  ctx.arc(EGG_POS.x, EGG_POS.y, glowSize * 2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Egg body
  ctx.save();
  ctx.translate(EGG_POS.x, EGG_POS.y);
  ctx.scale(1, 1.2 * pulse);
  ctx.beginPath();
  ctx.arc(0, 0, EGG_RADIUS, 0, Math.PI * 2);
  const eggGrad = ctx.createRadialGradient(-10, -10, 0, 0, 0, EGG_RADIUS);
  eggGrad.addColorStop(0, "#ffe4f0");
  eggGrad.addColorStop(0.3, "#ffb6d9");
  eggGrad.addColorStop(0.7, "#e87bcf");
  eggGrad.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = eggGrad;
  ctx.fill();
  ctx.restore();

  // Egg shine
  ctx.beginPath();
  ctx.arc(EGG_POS.x - 15, EGG_POS.y - 15, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fill();

  // Orbiting particles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time * 0.002;
    const orbitR = EGG_RADIUS * 1.8 + Math.sin(time * 0.003 + i) * 10;
    const px = EGG_POS.x + Math.cos(angle) * orbitR;
    const py = EGG_POS.y + Math.sin(angle) * orbitR;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.3 + Math.sin(time * 0.005 + i) * 0.2})`;
    ctx.fill();
  }

  // Label
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#ffb6d9";
  ctx.textAlign = "center";
  ctx.fillText("THE EGG", EGG_POS.x, EGG_POS.y + EGG_RADIUS * 1.3 + 20);
}

function drawImmuneCells(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  for (const cell of state.immuneCells) {
    const pulse = 1 + Math.sin(time * 0.008) * 0.1;
    // Glow
    ctx.beginPath();
    ctx.arc(cell.pos.x, cell.pos.y, cell.radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 50, 50, 0.1)";
    ctx.fill();
    // Body
    ctx.beginPath();
    ctx.arc(cell.pos.x, cell.pos.y, cell.radius * pulse, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cell.pos.x, cell.pos.y, 0, cell.pos.x, cell.pos.y, cell.radius);
    grad.addColorStop(0, "#ff6666");
    grad.addColorStop(1, "#cc0000");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Spikes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time * 0.003;
      ctx.beginPath();
      ctx.moveTo(cell.pos.x + Math.cos(a) * cell.radius, cell.pos.y + Math.sin(a) * cell.radius);
      ctx.lineTo(cell.pos.x + Math.cos(a) * cell.radius * 1.4, cell.pos.y + Math.sin(a) * cell.radius * 1.4);
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, time: number, isLocal: boolean): void {
  const charDef = getCharacterDef(player.characterId);
  const px = player.pos.x;
  const py = player.pos.y;
  const r = player.radius;
  const seed = hashSeed(player.id);

  // how hard the tail whips = current speed
  const spd = Math.min(1, Math.hypot(player.vel.x, player.vel.y) / 6);

  // expression driven by game state
  let expression: Expression = "idle";
  if (player.hitFlash > 0.35) expression = "hurt";
  else if (player.isDashing || player.abilityActiveEnd > time) expression = "determined";
  else if (player.health < player.maxHealth * 0.3) expression = "angry";
  else if (spd > 0.55) expression = "happy";

  // ability aura
  if (player.abilityFlash > 0) {
    ctx.beginPath();
    ctx.arc(px, py, r * (2.2 + (1 - player.abilityFlash) * 2), 0, Math.PI * 2);
    ctx.strokeStyle = charDef.color;
    ctx.globalAlpha = player.abilityFlash * 0.6;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── THE ACTUAL CARTOON SPERM ──
  drawSpermByCharacter(ctx, player.characterId, {
    x: px,
    y: py,
    r: r * 0.92,
    angle: player.facing,
    time,
    color: charDef.color,
    expression,
    effort: 0.28 + spd * 0.72,
    hitFlash: player.hitFlash,
    boosting: player.isDashing || player.abilityActiveEnd > time,
    shielded: player.shielded,
    seed,
  });

  // ── nameplate + health bar ──
  const barWidth = r * 2.8;
  const barHeight = 4;
  const barY = py - r * 2.5;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(px - barWidth / 2, barY, barWidth, barHeight);
  const healthPct = Math.max(0, player.health / player.maxHealth);
  const healthColor = healthPct > 0.5 ? "#39ff14" : healthPct > 0.25 ? "#ffd700" : "#ff0044";
  ctx.fillStyle = healthColor;
  ctx.fillRect(px - barWidth / 2, barY, barWidth * healthPct, barHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px - barWidth / 2, barY, barWidth, barHeight);

  ctx.font = isLocal ? "bold 11px monospace" : "10px monospace";
  ctx.fillStyle = isLocal ? "#e9d5ff" : "#9d8bb0";
  ctx.textAlign = "center";
  ctx.fillText(player.name, px, barY - 5);

  if (isLocal) {
    // bobbing arrow over your own sperm
    const bob = Math.sin(time * 0.006) * 3;
    ctx.beginPath();
    ctx.moveTo(px, barY - 14 + bob);
    ctx.lineTo(px - 5, barY - 22 + bob);
    ctx.lineTo(px + 5, barY - 22 + bob);
    ctx.closePath();
    ctx.fillStyle = "#8b5cf6";
    ctx.fill();
  }
}

/** stable small number from an id so animations are de-synced per player */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h / 997) * Math.PI * 2;
}

/** Big signature Monad Blast: rings + rotating diamond + energy spokes. */
function drawMonadBlast(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const fx = state.monadBlastFx;
  if (!fx) return;
  const k = Math.min(1, (time - fx.start) / 1300);
  const ease = 1 - Math.pow(1 - k, 3);
  const R = 40 + ease * 340;
  const fade = 1 - k;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // shockwave rings
  for (let i = 0; i < 3; i++) {
    const rr = R * (1 - i * 0.17);
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, Math.max(1, rr), 0, Math.PI * 2);
    ctx.strokeStyle = ["#e9d5ff", "#a855f7", "#ff7ad9"][i];
    ctx.globalAlpha = fade * (0.75 - i * 0.18);
    ctx.lineWidth = 7 - i * 2;
    ctx.stroke();
  }

  // energy spokes
  ctx.globalAlpha = fade * 0.55;
  ctx.strokeStyle = "#c4b5fd";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + time * 0.004;
    ctx.beginPath();
    ctx.moveTo(fx.x + Math.cos(a) * R * 0.35, fx.y + Math.sin(a) * R * 0.35);
    ctx.lineTo(fx.x + Math.cos(a) * R * 1.05, fx.y + Math.sin(a) * R * 1.05);
    ctx.stroke();
  }

  // core glow
  const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, R * 0.75);
  g.addColorStop(0, `rgba(233,213,255,${fade * 0.75})`);
  g.addColorStop(0.4, `rgba(168,85,247,${fade * 0.35})`);
  g.addColorStop(1, "rgba(139,92,246,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(fx.x, fx.y, R * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // rotating Monad diamond
  ctx.globalAlpha = fade * 0.9;
  ctx.translate(fx.x, fx.y);
  ctx.rotate(time * 0.006);
  const d = 30 + ease * 90;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -d); ctx.lineTo(d, 0); ctx.lineTo(0, d); ctx.lineTo(-d, 0);
  ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = "#ff7ad9";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const d2 = d * 0.55;
  ctx.moveTo(0, -d2); ctx.lineTo(d2, 0); ctx.lineTo(0, d2); ctx.lineTo(-d2, 0);
  ctx.closePath(); ctx.stroke();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    switch (p.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
        break;
      case "spark":
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      case "ring":
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.size * (1 - alpha + 0.1), 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case "text":
        ctx.font = `bold ${p.size}px monospace`;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.textAlign = "center";
        ctx.fillText(p.text || "", p.pos.x, p.pos.y);
        ctx.globalAlpha = 1;
        break;
    }
  }
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: GameState,
  localPlayerId: string,
  time: number
): void {
  const w = canvas.width;
  const h = canvas.height;
  const localPlayer = state.players.get(localPlayerId);

  // Timer (top center)
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(w / 2 - 60, 8, 120, 36);
  ctx.strokeStyle = "#8b5cf6";
  ctx.lineWidth = 2;
  ctx.strokeRect(w / 2 - 60, 8, 120, 36);
  const mins = Math.floor(state.timeRemaining / 60);
  const secs = Math.floor(state.timeRemaining % 60);
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = state.timeRemaining < 20 ? "#ff4488" : "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, w / 2, 34);

  // Players alive (top left)
  const alive = Array.from(state.players.values()).filter((p) => p.alive).length;
  const total = state.players.size;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(8, 8, 130, 36);
  ctx.strokeStyle = "#8b5cf688";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 130, 36);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(`🧬 ${alive}/${total} ALIVE`, 18, 30);

  // Local player MON (top right)
  if (localPlayer) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(w - 138, 8, 130, 36);
    ctx.strokeStyle = "#ffd70088";
    ctx.lineWidth = 1;
    ctx.strokeRect(w - 138, 8, 130, 36);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.textAlign = "right";
    ctx.fillText(`💎 ${localPlayer.mon} MON`, w - 18, 30);
  }

  // Leaderboard (left side)
  const sortedPlayers = Array.from(state.players.values())
    .filter((p) => p.alive)
    .sort((a, b) => (b.health + b.mon) - (a.health + a.mon));
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(8, 52, 160, sortedPlayers.length * 22 + 8);
  ctx.font = "11px monospace";
  for (let i = 0; i < sortedPlayers.length; i++) {
    const p = sortedPlayers[i];
    const charDef = getCharacterDef(p.characterId);
    ctx.fillStyle = p.id === localPlayerId ? "#8b5cf6" : "#aaa";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}. ${charDef.emoji} ${p.name}`, 14, 68 + i * 22);
  }

  // ── Ability bar (bottom centre) ──
  if (localPlayer) {
    const charDef = getCharacterDef(localPlayer.characterId);
    const slots = [
      { label: "BOOST",  key: "SPC", ready: time > localPlayer.dashCooldownEnd,        cd: localPlayer.dashCooldownEnd,        max: 2000,  col: "#7ae0ff", cost: "" },
      { label: "SUCK",   key: "Q",   ready: time > localPlayer.suckCooldownEnd,        cd: localPlayer.suckCooldownEnd,        max: 9000,  col: "#a855f7", cost: "" },
      { label: "BLAST",  key: "E",   ready: time > localPlayer.blastCooldownEnd,       cd: localPlayer.blastCooldownEnd,       max: 11000, col: "#ff7ad9", cost: "" },
      { label: charDef.abilityName.split(" ")[0].slice(0, 6), key: charDef.abilityKey, ready: time > localPlayer.abilityCooldownEnd, cd: localPlayer.abilityCooldownEnd, max: charDef.abilityCooldown, col: charDef.color, cost: "" },
      { label: "MONAD",  key: "M",   ready: localPlayer.mon >= 10 && time > localPlayer.monadBlastCooldownEnd, cd: localPlayer.monadBlastCooldownEnd, max: 6000, col: "#e9d5ff", cost: "10 MON" },
    ];

    const SW = 74, GAP = 8;
    const totalW = slots.length * SW + (slots.length - 1) * GAP;
    let sx = w / 2 - totalW / 2;
    const sy = h - 62;

    for (const s of slots) {
      // frame
      ctx.fillStyle = s.ready ? "rgba(20,4,38,0.85)" : "rgba(12,12,16,0.8)";
      ctx.fillRect(sx, sy, SW, 46);
      // cooldown sweep
      if (!s.ready && s.cd > time) {
        const p = Math.max(0, Math.min(1, (s.cd - time) / s.max));
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(sx, sy + 46 * (1 - p), SW, 46 * p);
      }
      ctx.strokeStyle = s.ready ? s.col : "rgba(90,80,110,0.5)";
      ctx.lineWidth = s.ready ? 2 : 1;
      ctx.strokeRect(sx, sy, SW, 46);

      ctx.textAlign = "center";
      ctx.font = "bold 11px 'Segoe UI', system-ui, monospace";
      ctx.fillStyle = s.ready ? "#ffffff" : "#6b6480";
      ctx.fillText(s.label, sx + SW / 2, sy + 19);

      ctx.font = "9px 'Segoe UI', system-ui, monospace";
      ctx.fillStyle = s.ready ? s.col : "#544d68";
      ctx.fillText(`[${s.key}]`, sx + SW / 2, sy + 32);

      if (s.cost) {
        ctx.font = "8px monospace";
        ctx.fillStyle = localPlayer.mon >= 10 ? "#ffd700" : "#7a6a3a";
        ctx.fillText(s.cost, sx + SW / 2, sy + 42);
      } else if (!s.ready && s.cd > time) {
        ctx.font = "8px monospace";
        ctx.fillStyle = "#8b7fa8";
        ctx.fillText(`${((s.cd - time) / 1000).toFixed(1)}s`, sx + SW / 2, sy + 42);
      }
      sx += SW + GAP;
    }

    // Health/energy bars (bottom left)
    const barX = 20;
    const barW = 150;
    // Health
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, h - 60, barW, 10);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(barX, h - 60, barW * (localPlayer.health / localPlayer.maxHealth), 10);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.round(localPlayer.health)}`, barX + 2, h - 52);
    // Energy
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, h - 45, barW, 10);
    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(barX, h - 45, barW * (localPlayer.energy / localPlayer.maxEnergy), 10);
    ctx.fillText(`EN: ${Math.round(localPlayer.energy)}`, barX + 2, h - 37);
  }

  // Event announcement
  if (state.eventAnnouncement) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, h / 2 - 40, w, 80);
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#8b5cf6";
    ctx.textAlign = "center";
    ctx.fillText(state.eventAnnouncement, w / 2, h / 2 + 10);
  }

  // Parallel event UI
  if (state.parallelEventActive) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(w / 2 - 200, h - 120, 400, 60);
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#8b5cf6";
    ctx.textAlign = "center";
    ctx.fillText("MONAD PARALLEL EVENT — CHOOSE NOW!", w / 2, h - 95);
    ctx.font = "12px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("[1] BOOST  [2] ATTACK  [3] DEFEND  [4] MUTATE", w / 2, h - 72);
  }

  // Minimap (bottom right)
  const mmSize = 120;
  const mmX = w - mmSize - 10;
  const mmY = h - mmSize - 10;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(mmX, mmY, mmSize, mmSize);
  ctx.strokeStyle = "#8b5cf688";
  ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmSize, mmSize);
  // Egg on minimap
  ctx.beginPath();
  ctx.arc(mmX + (EGG_POS.x / ARENA_SIZE) * mmSize, mmY + (EGG_POS.y / ARENA_SIZE) * mmSize, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#ffb6d9";
  ctx.fill();
  // Players on minimap
  for (const p of state.players.values()) {
    if (!p.alive) continue;
    ctx.beginPath();
    ctx.arc(mmX + (p.pos.x / ARENA_SIZE) * mmSize, mmY + (p.pos.y / ARENA_SIZE) * mmSize, p.id === localPlayerId ? 3 : 2, 0, Math.PI * 2);
    ctx.fillStyle = p.id === localPlayerId ? "#8b5cf6" : "#aaa";
    ctx.fill();
  }
}
