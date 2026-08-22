import {
  ARENA_SIZE, PLAYER_RADIUS, DASH_SPEED, DASH_DURATION,
  KNOCKBACK_FORCE, DAMAGE_ON_HIT, CHARACTERS, getCharacterDef, resolveBaseId, type Mutation,
  type RandomEventType, type ParallelChoice, EGG_POS, EGG_RADIUS,
  MONAD_BLAST_RADIUS, MONAD_BLAST_KNOCKBACK,
} from "./game-config";

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  name: string;
  characterId: string;
  pos: Vector2;
  vel: Vector2;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  mon: number;
  speed: number;
  radius: number;
  alive: boolean;
  facing: number; // angle in radians
  // Ability state
  abilityCooldownEnd: number;
  abilityActiveEnd: number;
  dashCooldownEnd: number;
  dashEnd: number;
  isDashing: boolean;
  suckCooldownEnd: number;
  suckActiveEnd: number;
  blastCooldownEnd: number;
  monadBlastCooldownEnd: number;
  // Status effects
  reversed: boolean;
  shielded: boolean;
  mutations: Mutation[];
  // Score
  kills: number;
  monCollected: number;
  // Animation
  hitFlash: number;
  abilityFlash: number;
  isAI: boolean;
  // Parallel event choice
  parallelChoice: ParallelChoice | null;
}

export interface MonCrystal {
  id: string;
  pos: Vector2;
  value: number;
  radius: number;
  pulsePhase: number;
}

export interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "circle" | "spark" | "ring" | "text";
  text?: string;
  decay?: number;
}

export interface ImmuneCell {
  id: string;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  life: number;
}

export interface ActiveEvent {
  type: RandomEventType;
  endTime: number;
  announced: boolean;
}

export interface GameState {
  players: Map<string, PlayerState>;
  monCrystals: MonCrystal[];
  particles: Particle[];
  immuneCells: ImmuneCell[];
  activeEvents: ActiveEvent[];
  timeRemaining: number;
  gamePhase: "waiting" | "countdown" | "playing" | "parallel_event" | "ended";
  winner: string | null;
  currentEvent: ActiveEvent | null;
  eventAnnouncement: string | null;
  eventAnnouncementEnd: number;
  // Parallel event
  parallelEventActive: boolean;
  parallelEventChoiceEnd: number;
  parallelEventResolving: boolean;
  // Environment
  fluidCurrent: Vector2;
  gravityFlipped: boolean;
  // Timing
  lastEventTime: number;
  lastParallelTime: number;
  gameStartTime: number;
  shakeAmount: number;
  shakeDecay: number;
  /** set when someone fires the Monad Blast so the renderer can go cinematic */
  monadBlastFx: { x: number; y: number; start: number; owner: string } | null;
  /** server-authoritative input buffer (multiplayer only; unused in solo) */
  __inputs?: Map<string, PlayerInput>;
}

export function createPlayer(
  id: string,
  name: string,
  characterId: string,
  isAI: boolean = false
): PlayerState {
  const charDef = getCharacterDef(characterId);
  const angle = Math.random() * Math.PI * 2;
  const dist = 400 + Math.random() * 300;
  return {
    id,
    name,
    characterId,
    pos: {
      x: ARENA_SIZE / 2 + Math.cos(angle) * dist,
      y: ARENA_SIZE / 2 + Math.sin(angle) * dist,
    },
    vel: { x: 0, y: 0 },
    health: charDef.baseHealth,
    maxHealth: charDef.baseHealth,
    energy: charDef.baseEnergy,
    maxEnergy: charDef.baseEnergy,
    mon: 0,
    speed: charDef.baseSpeed,
    radius: PLAYER_RADIUS,
    alive: true,
    facing: 0,
    abilityCooldownEnd: 0,
    abilityActiveEnd: 0,
    dashCooldownEnd: 0,
    dashEnd: 0,
    isDashing: false,
    suckCooldownEnd: 0,
    suckActiveEnd: 0,
    blastCooldownEnd: 0,
    monadBlastCooldownEnd: 0,
    reversed: false,
    shielded: false,
    mutations: [],
    kills: 0,
    monCollected: 0,
    hitFlash: 0,
    abilityFlash: 0,
    isAI,
    parallelChoice: null,
  };
}

export function createGameState(): GameState {
  return {
    players: new Map(),
    monCrystals: [],
    particles: [],
    immuneCells: [],
    activeEvents: [],
    timeRemaining: 120,
    gamePhase: "waiting",
    winner: null,
    currentEvent: null,
    eventAnnouncement: null,
    eventAnnouncementEnd: 0,
    parallelEventActive: false,
    parallelEventChoiceEnd: 0,
    parallelEventResolving: false,
    fluidCurrent: { x: 0, y: 0 },
    gravityFlipped: false,
    lastEventTime: 0,
    lastParallelTime: 0,
    gameStartTime: 0,
    shakeAmount: 0,
    shakeDecay: 0.9,
    monadBlastFx: null,
  };
}

// Spawn MON crystals
let crystalIdCounter = 0;
export function spawnMonCrystals(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) {
    state.monCrystals.push({
      id: `crystal-${crystalIdCounter++}`,
      pos: {
        x: 100 + Math.random() * (ARENA_SIZE - 200),
        y: 100 + Math.random() * (ARENA_SIZE - 200),
      },
      value: 10 + Math.floor(Math.random() * 20),
      radius: 8 + Math.random() * 6,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }
}

export function addParticle(
  state: GameState,
  pos: Vector2,
  vel: Vector2,
  life: number,
  color: string,
  size: number,
  type: Particle["type"] = "circle",
  text?: string
): void {
  state.particles.push({ pos: { ...pos }, vel: { ...vel }, life, maxLife: life, color, size, type, text });
}

export function addScreenShake(state: GameState, amount: number): void {
  state.shakeAmount = Math.max(state.shakeAmount, amount);
}

// Distance helper
export function dist(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Knockback helper
export function applyKnockback(
  target: PlayerState,
  from: Vector2,
  force: number
): void {
  const dx = target.pos.x - from.x;
  const dy = target.pos.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  target.vel.x += (dx / d) * force;
  target.vel.y += (dy / d) * force;
}

// Player input
export interface PlayerInput {
  dx: number;
  dy: number;
  dash: boolean;
  ability: boolean;
  monadBlast: boolean;
  /** Q — purple vortex that sucks players + MON toward you */
  suck?: boolean;
  /** E — shockwave that knocks everything back */
  blast?: boolean;
}

/** Fired by the engine so the UI/audio layer can react. */
export interface EngineHooks {
  onSound?: (s: string) => void;
  onMonadBlast?: (x: number, y: number) => void;
}

let hooks: EngineHooks = {};
export function setEngineHooks(h: EngineHooks): void { hooks = h; }
function snd(s: string): void { hooks.onSound?.(s); }

// Main game update
export function updateGame(state: GameState, dt: number, now: number, inputs: Map<string, PlayerInput>): void {
  if (state.gamePhase !== "playing" && state.gamePhase !== "parallel_event") return;

  const dtSec = dt / 1000;
  state.timeRemaining -= dtSec;
  if (state.timeRemaining <= 0) {
    endGame(state);
    return;
  }

  // Update players
  const players = Array.from(state.players.values()).filter((p) => p.alive);
  
  for (const player of players) {
    const input = inputs.get(player.id);
    if (input && !player.isAI) {
      applyInput(state, player, input, now);
    } else if (player.isAI) {
      updateAI(state, player, now, dtSec);
    }

    // Apply velocity with friction
    const frictionMult = player.reversed ? -1 : 1;
    const speedMult = player.isDashing ? 2.5 : 1;
    const mutationSpeed = player.mutations.find((m) => m.type === "speed") ? 1.5 : 1;
    const gravityMult = state.gravityFlipped ? -1 : 1;

    player.pos.x += (player.vel.x * frictionMult * speedMult * mutationSpeed + state.fluidCurrent.x) * dtSec * 60;
    player.pos.y += (player.vel.y * frictionMult * speedMult * mutationSpeed * gravityMult + state.fluidCurrent.y) * dtSec * 60;

    // Velocity friction
    player.vel.x *= 0.92;
    player.vel.y *= 0.92;

    // Arena bounds
    player.pos.x = Math.max(player.radius, Math.min(ARENA_SIZE - player.radius, player.pos.x));
    player.pos.y = Math.max(player.radius, Math.min(ARENA_SIZE - player.radius, player.pos.y));

    // Update facing
    if (Math.abs(player.vel.x) > 0.1 || Math.abs(player.vel.y) > 0.1) {
      player.facing = Math.atan2(player.vel.y, player.vel.x);
    }

    // Dash end
    if (player.isDashing && now > player.dashEnd) {
      player.isDashing = false;
    }

    // Ability end
    if (player.abilityActiveEnd > 0 && now > player.abilityActiveEnd) {
      player.abilityActiveEnd = 0;
      player.reversed = false;
      player.speed = getCharacterDef(player.characterId).baseSpeed || 3;
      player.radius = PLAYER_RADIUS;
    }

    // Mutation expiry
    player.mutations = player.mutations.filter((m) => now - m.startTime < m.duration);
    player.shielded = player.mutations.some((m) => m.type === "shield");

    // Hit flash decay
    if (player.hitFlash > 0) player.hitFlash -= dtSec * 5;
    if (player.abilityFlash > 0) player.abilityFlash -= dtSec * 3;

    // Energy regen
    player.energy = Math.min(player.maxEnergy, player.energy + dtSec * 5);

    // Collect MON crystals
    for (let i = state.monCrystals.length - 1; i >= 0; i--) {
      const crystal = state.monCrystals[i];
      if (dist(player.pos, crystal.pos) < player.radius + crystal.radius) {
        player.mon += crystal.value;
        player.monCollected += crystal.value;
        addParticle(state, crystal.pos, { x: 0, y: -1 }, 0.8, "#ffd700", 14, "text", `+${crystal.value}`);
        for (let j = 0; j < 5; j++) {
          addParticle(state, crystal.pos, { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 }, 0.5, "#ffd700", 4);
        }
        state.monCrystals.splice(i, 1);
      }
    }
  }

  // Player vs Player collision
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const d = dist(a.pos, b.pos);
      const minDist = a.radius + b.radius;
      if (d < minDist && d > 0) {
        // Separate
        const overlap = minDist - d;
        const nx = (b.pos.x - a.pos.x) / d;
        const ny = (b.pos.y - a.pos.y) / d;
        a.pos.x -= nx * overlap * 0.5;
        a.pos.y -= ny * overlap * 0.5;
        b.pos.x += nx * overlap * 0.5;
        b.pos.y += ny * overlap * 0.5;

        // Knockback
        const relVel = Math.sqrt(
          (a.vel.x - b.vel.x) ** 2 + (a.vel.y - b.vel.y) ** 2
        );
        if (relVel > 2) {
          const damage = Math.min(DAMAGE_ON_HIT, relVel * 3);
          if (!b.shielded) {
            b.health -= damage;
            b.hitFlash = 1;
          }
          if (!a.shielded) {
            a.health -= damage * 0.5;
            a.hitFlash = 0.5;
          }
          applyKnockback(b, a.pos, KNOCKBACK_FORCE);
          applyKnockback(a, b.pos, KNOCKBACK_FORCE * 0.5);
          addScreenShake(state, 3);
          const mid = { x: (a.pos.x + b.pos.x) / 2, y: (a.pos.y + b.pos.y) / 2 };
          for (let k = 0; k < 8; k++) {
            addParticle(state, mid, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }, 0.4, "#ff4488", 5, "spark");
          }
          addParticle(state, mid, { x: 0, y: -1 }, 0.6, "#ff4488", 12, "text", `-${Math.round(damage)}`);
        }
      }
    }
  }

  // Check eliminations
  for (const player of players) {
    if (player.health <= 0 && player.alive) {
      player.alive = false;
      addScreenShake(state, 8);
      for (let k = 0; k < 20; k++) {
        addParticle(state, player.pos, { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 }, 0.8, "#ff0044", 6, "spark");
      }
      addParticle(state, player.pos, { x: 0, y: -1.5 }, 1.2, "#ff0044", 20, "text", "ELIMINATED");
    }
  }

  // Check win condition
  const alivePlayers = players.filter((p) => p.alive);
  if (alivePlayers.length <= 1) {
    if (alivePlayers.length === 1) {
      state.winner = alivePlayers[0].id;
    }
    endGame(state);
    return;
  }

  // Check if someone reached the egg in final 20 seconds
  if (state.timeRemaining < 20) {
    for (const p of alivePlayers) {
      if (dist(p.pos, EGG_POS) < EGG_RADIUS + p.radius) {
        state.winner = p.id;
        endGame(state);
        return;
      }
    }
  }

  // Spawn crystals periodically
  if (state.monCrystals.length < 15 && Math.random() < dtSec * 0.5) {
    spawnMonCrystals(state, 1);
  }

  // Update particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.pos.x += p.vel.x * dtSec * 60;
    p.pos.y += p.vel.y * dtSec * 60;
    p.life -= dtSec;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Update immune cells
  for (let i = state.immuneCells.length - 1; i >= 0; i--) {
    const cell = state.immuneCells[i];
    cell.pos.x += cell.vel.x * dtSec * 60;
    cell.pos.y += cell.vel.y * dtSec * 60;
    cell.life -= dtSec;
    // Bounce off walls
    if (cell.pos.x < 50 || cell.pos.x > ARENA_SIZE - 50) cell.vel.x *= -1;
    if (cell.pos.y < 50 || cell.pos.y > ARENA_SIZE - 50) cell.vel.y *= -1;
    // Attack players
    for (const p of alivePlayers) {
      if (dist(cell.pos, p.pos) < cell.radius + p.radius) {
        if (!p.shielded) p.health -= dtSec * 20;
        p.hitFlash = 0.5;
        applyKnockback(p, cell.pos, 2);
      }
    }
    if (cell.life <= 0) state.immuneCells.splice(i, 1);
  }

  // Monad blast FX expiry
  if (state.monadBlastFx && now - state.monadBlastFx.start > 1300) state.monadBlastFx = null;

  // Screen shake decay
  state.shakeAmount *= state.shakeDecay;
  if (state.shakeAmount < 0.1) state.shakeAmount = 0;

  // Event announcement decay
  if (state.eventAnnouncement && now > state.eventAnnouncementEnd) {
    state.eventAnnouncement = null;
  }

  // Crystal pulse
  for (const c of state.monCrystals) {
    c.pulsePhase += dtSec * 3;
  }
}

function applyInput(state: GameState, player: PlayerState, input: PlayerInput, now: number): void {
  const charDef = getCharacterDef(player.characterId);
  
  // Movement
  if (input.dx !== 0 || input.dy !== 0) {
    const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
    player.vel.x += (input.dx / len) * player.speed * 0.5;
    player.vel.y += (input.dy / len) * player.speed * 0.5;
  }

  // Dash
  if (input.dash && now > player.dashCooldownEnd && !player.isDashing) {
    player.isDashing = true;
    player.dashEnd = now + DASH_DURATION;
    player.dashCooldownEnd = now + 2000;
    const dashDir = Math.abs(player.vel.x) > 0.1 || Math.abs(player.vel.y) > 0.1
      ? player.facing
      : 0;
    player.vel.x += Math.cos(dashDir) * DASH_SPEED;
    player.vel.y += Math.sin(dashDir) * DASH_SPEED;
    for (let i = 0; i < 6; i++) {
      addParticle(state, player.pos, { x: -Math.cos(dashDir) * 3 + (Math.random() - 0.5), y: -Math.sin(dashDir) * 3 + (Math.random() - 0.5) }, 0.3, charDef.color, 4);
    }
    snd("dash");
  }

  // ── SUCK (Q) — purple vortex pulls players + MON toward you ──
  if (input.suck && now > player.suckCooldownEnd) {
    player.suckCooldownEnd = now + 9000;
    player.suckActiveEnd = now + 1400;
    snd("mutate");
    addParticle(state, player.pos, { x: 0, y: 0 }, 0.6, "#a855f7", 260, "ring");
  }
  if (player.suckActiveEnd > now) {
    const R = 300;
    for (const other of state.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      const d = dist(player.pos, other.pos);
      if (d < R && d > 1) {
        const f = (1 - d / R) * 2.4;
        other.vel.x += ((player.pos.x - other.pos.x) / d) * f;
        other.vel.y += ((player.pos.y - other.pos.y) / d) * f;
      }
    }
    for (const c of state.monCrystals) {
      const d = dist(player.pos, c.pos);
      if (d < R && d > 1) {
        const f = (1 - d / R) * 7;
        c.pos.x += ((player.pos.x - c.pos.x) / d) * f;
        c.pos.y += ((player.pos.y - c.pos.y) / d) * f;
      }
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 120 + Math.random() * 160;
      addParticle(state,
        { x: player.pos.x + Math.cos(a) * rr, y: player.pos.y + Math.sin(a) * rr },
        { x: -Math.cos(a) * 7, y: -Math.sin(a) * 7 }, 0.4, "#a855f7", 4, "spark");
    }
  }

  // ── BLAST (E) — radial shockwave ──
  if (input.blast && now > player.blastCooldownEnd) {
    player.blastCooldownEnd = now + 11000;
    snd("blast");
    addScreenShake(state, 9);
    const R = 240;
    for (const other of state.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      if (dist(player.pos, other.pos) < R) {
        applyKnockback(other, player.pos, 22);
        if (!other.shielded) other.health -= 18;
        other.hitFlash = 1;
      }
    }
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      addParticle(state, player.pos, { x: Math.cos(a) * 9, y: Math.sin(a) * 9 }, 0.5, "#ff7ad9", 6, "spark");
    }
    addParticle(state, player.pos, { x: 0, y: 0 }, 0.55, "#ff7ad9", R, "ring");
  }

  // Ability
  if (input.ability && now > player.abilityCooldownEnd) {
    activateAbility(state, player, now);
    snd("powerup");
  }

  // ── MONAD BLAST — the signature move ──
  if (input.monadBlast && player.mon >= 10 && now > player.monadBlastCooldownEnd) {
    player.mon -= 10;
    player.monadBlastCooldownEnd = now + 6000;
    state.monadBlastFx = { x: player.pos.x, y: player.pos.y, start: now, owner: player.id };
    snd("monadBlast");
    hooks.onMonadBlast?.(player.pos.x, player.pos.y);
    addScreenShake(state, 20);

    for (const other of state.players.values()) {
      if (other.id !== player.id && other.alive && dist(player.pos, other.pos) < MONAD_BLAST_RADIUS) {
        applyKnockback(other, player.pos, MONAD_BLAST_KNOCKBACK);
        if (!other.shielded) other.health -= 32;
        other.hitFlash = 1.2;
      }
    }
    // triple expanding ring + heavy sparks
    addParticle(state, player.pos, { x: 0, y: 0 }, 0.75, "#e9d5ff", MONAD_BLAST_RADIUS * 1.25, "ring");
    addParticle(state, player.pos, { x: 0, y: 0 }, 0.6, "#a855f7", MONAD_BLAST_RADIUS, "ring");
    addParticle(state, player.pos, { x: 0, y: 0 }, 0.45, "#ff7ad9", MONAD_BLAST_RADIUS * 0.7, "ring");
    for (let i = 0; i < 56; i++) {
      const angle = (i / 56) * Math.PI * 2;
      const sp = 7 + Math.random() * 7;
      addParticle(state, player.pos, { x: Math.cos(angle) * sp, y: Math.sin(angle) * sp },
        0.5 + Math.random() * 0.4, i % 3 === 0 ? "#ffd700" : "#a855f7", 5 + Math.random() * 5, "spark");
    }
    addParticle(state, player.pos, { x: 0, y: -1.6 }, 1.1, "#e9d5ff", 22, "text", "MONAD BLAST");
  }
}

function activateAbility(state: GameState, player: PlayerState, now: number): void {
  const charDef = getCharacterDef(player.characterId);
  player.abilityCooldownEnd = now + charDef.abilityCooldown;
  player.abilityActiveEnd = now + charDef.abilityDuration;
  player.abilityFlash = 1;
  player.energy -= charDef.abilityCost;

  // Personas resolve to their gameplay archetype so ability behaviour is unchanged.
  switch (resolveBaseId(player.characterId)) {
    case "space": // Rocket Boost
      player.speed = charDef.baseSpeed * 3;
      player.vel.x += Math.cos(player.facing) * 10;
      player.vel.y += Math.sin(player.facing) * 10;
      for (let i = 0; i < 15; i++) {
        addParticle(state, player.pos, { x: -Math.cos(player.facing) * 5 + (Math.random() - 0.5) * 2, y: -Math.sin(player.facing) * 5 + (Math.random() - 0.5) * 2 }, 0.5, "#ff6600", 5, "spark");
      }
      break;
    case "politician": // New Law - reverse nearby opponents
      for (const other of state.players.values()) {
        if (other.id !== player.id && other.alive && dist(player.pos, other.pos) < 200) {
          other.reversed = true;
        }
      }
      addParticle(state, player.pos, { x: 0, y: 0 }, 0.5, "#ff6b35", 150, "ring");
      break;
    case "ai": // Clone
      // Spawn temporary clones as particles that damage
      for (let i = 0; i < 3; i++) {
        const angle = player.facing + (i - 1) * 0.5;
        for (let j = 0; j < 8; j++) {
          addParticle(state, player.pos, { x: Math.cos(angle) * (3 + j * 0.5), y: Math.sin(angle) * (3 + j * 0.5) }, 0.4, "#39ff14", 4);
        }
      }
      // Damage nearby enemies
      for (const other of state.players.values()) {
        if (other.id !== player.id && other.alive && dist(player.pos, other.pos) < 150) {
          if (!other.shielded) other.health -= 20;
          other.hitFlash = 1;
          applyKnockback(other, player.pos, 10);
        }
      }
      break;
    case "crypto": // MON Magnet
      for (const crystal of state.monCrystals) {
        const d = dist(player.pos, crystal.pos);
        if (d < 300 && d > 0) {
          const pull = 5 / (d / 50);
          crystal.pos.x += (player.pos.x - crystal.pos.x) / d * pull;
          crystal.pos.y += (player.pos.y - crystal.pos.y) / d * pull;
        }
      }
      addParticle(state, player.pos, { x: 0, y: 0 }, 0.5, "#ffd700", 200, "ring");
      break;
    case "scientist": // Mutate
      const mutations: Mutation["type"][] = ["speed", "giant", "damage", "shield", "magnet"];
      const mutType = mutations[Math.floor(Math.random() * mutations.length)];
      player.mutations.push({ type: mutType, duration: 5000, startTime: now });
      if (mutType === "speed") player.speed = charDef.baseSpeed * 1.8;
      if (mutType === "giant") player.radius = PLAYER_RADIUS * 1.8;
      if (mutType === "shield") player.shielded = true;
      addParticle(state, player.pos, { x: 0, y: -1 }, 0.8, "#bf5fff", 16, "text", `MUTATED: ${mutType.toUpperCase()}`);
      for (let i = 0; i < 12; i++) {
        addParticle(state, player.pos, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }, 0.6, "#bf5fff", 4, "spark");
      }
      break;
    case "chaos": // Random effect
      const effects = ["explosion", "heal", "teleport", "shockwave", "mega_speed"];
      const effect = effects[Math.floor(Math.random() * effects.length)];
      switch (effect) {
        case "explosion":
          for (const other of state.players.values()) {
            if (other.id !== player.id && other.alive && dist(player.pos, other.pos) < 200) {
              if (!other.shielded) other.health -= 30;
              applyKnockback(other, player.pos, 20);
              other.hitFlash = 1;
            }
          }
          addScreenShake(state, 8);
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            addParticle(state, player.pos, { x: Math.cos(a) * 8, y: Math.sin(a) * 8 }, 0.5, "#ff1493", 6, "spark");
          }
          break;
        case "heal":
          player.health = Math.min(player.maxHealth, player.health + 40);
          addParticle(state, player.pos, { x: 0, y: -1 }, 0.8, "#39ff14", 16, "text", "+40 HP");
          break;
        case "teleport":
          player.pos.x = 100 + Math.random() * (ARENA_SIZE - 200);
          player.pos.y = 100 + Math.random() * (ARENA_SIZE - 200);
          for (let i = 0; i < 15; i++) {
            addParticle(state, player.pos, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 }, 0.5, "#ff1493", 4, "spark");
          }
          break;
        case "shockwave":
          addScreenShake(state, 6);
          for (const other of state.players.values()) {
            if (other.id !== player.id && other.alive && dist(player.pos, other.pos) < 250) {
              applyKnockback(other, player.pos, 18);
            }
          }
          addParticle(state, player.pos, { x: 0, y: 0 }, 0.5, "#ff1493", 250, "ring");
          break;
        case "mega_speed":
          player.speed = charDef.baseSpeed * 4;
          break;
      }
      addParticle(state, player.pos, { x: 0, y: -1.5 }, 1, "#ff1493", 18, "text", `CHAOS: ${effect.toUpperCase()}`);
      break;
  }
}

function updateAI(state: GameState, ai: PlayerState, now: number, dtSec: number): void {
  // Simple AI behavior
  const alivePlayers = Array.from(state.players.values()).filter((p) => p.alive && p.id !== ai.id);
  const nearestPlayer = alivePlayers.reduce((closest, p) =>
    dist(ai.pos, p.pos) < dist(ai.pos, closest.pos) ? p : closest
  , alivePlayers[0]);

  const nearestCrystal = state.monCrystals.reduce((closest, c) =>
    dist(ai.pos, c.pos) < dist(ai.pos, closest.pos) ? c : closest
  , state.monCrystals[0]);

  // Decision: chase egg in final 20s, otherwise collect MON or fight
  let targetX: number, targetY: number;
  
  if (state.timeRemaining < 20) {
    targetX = EGG_POS.x;
    targetY = EGG_POS.y;
  } else if (ai.health < 40 && nearestCrystal) {
    // Low health: collect MON (gives score)
    targetX = nearestCrystal.pos.x;
    targetY = nearestCrystal.pos.y;
  } else if (nearestPlayer && dist(ai.pos, nearestPlayer.pos) < 300) {
    // Nearby enemy: attack
    targetX = nearestPlayer.pos.x;
    targetY = nearestPlayer.pos.y;
  } else if (nearestCrystal && dist(ai.pos, nearestCrystal.pos) < 400) {
    // Nearby crystal: collect
    targetX = nearestCrystal.pos.x;
    targetY = nearestCrystal.pos.y;
  } else {
    // Wander toward center
    targetX = ARENA_SIZE / 2 + (Math.random() - 0.5) * 400;
    targetY = ARENA_SIZE / 2 + (Math.random() - 0.5) * 400;
  }

  const dx = targetX - ai.pos.x;
  const dy = targetY - ai.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;

  ai.vel.x += (dx / d) * ai.speed * 0.3;
  ai.vel.y += (dy / d) * ai.speed * 0.3;

  // Occasionally use ability
  if (Math.random() < dtSec * 0.15 && now > ai.abilityCooldownEnd && ai.energy > 30) {
    activateAbility(state, ai, now);
  }

  // Occasionally dash
  if (Math.random() < dtSec * 0.3 && now > ai.dashCooldownEnd) {
    ai.isDashing = true;
    ai.dashEnd = now + DASH_DURATION;
    ai.dashCooldownEnd = now + 2000;
  }
}

function endGame(state: GameState): void {
  state.gamePhase = "ended";
  if (!state.winner) {
    // Winner is the player with most health or most MON
    const alive = Array.from(state.players.values()).filter((p) => p.alive);
    if (alive.length > 0) {
      state.winner = alive.reduce((best, p) =>
        p.health + p.mon > best.health + best.mon ? p : best
      ).id;
    }
  }
}

// Random event triggers
export function triggerRandomEvent(state: GameState, now: number): void {
  const events = ["immune_attack", "fluid_surge", "mutation_storm", "monad_surge", "gravity_flip"] as const;
  const event = events[Math.floor(Math.random() * events.length)];

  switch (event) {
    case "immune_attack":
      state.eventAnnouncement = "⚠️ IMMUNE SYSTEM ACTIVATED";
      state.eventAnnouncementEnd = now + 3000;
      // Spawn immune cells
      for (let i = 0; i < 5; i++) {
        state.immuneCells.push({
          id: `immune-${i}-${now}`,
          pos: { x: Math.random() * ARENA_SIZE, y: Math.random() * ARENA_SIZE },
          vel: { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 },
          radius: 30 + Math.random() * 20,
          life: 8,
        });
      }
      break;
    case "fluid_surge":
      state.eventAnnouncement = "🌊 FLUID SURGE INCOMING";
      state.eventAnnouncementEnd = now + 3000;
      const angle = Math.random() * Math.PI * 2;
      state.fluidCurrent = { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 };
      setTimeout(() => { state.fluidCurrent = { x: 0, y: 0 }; }, 6000);
      break;
    case "mutation_storm":
      state.eventAnnouncement = "🧬 MUTATION STORM";
      state.eventAnnouncementEnd = now + 3000;
      for (const p of state.players.values()) {
        if (p.alive) {
          const mutTypes: Mutation["type"][] = ["speed", "giant", "damage", "shield", "magnet"];
          p.mutations.push({ type: mutTypes[Math.floor(Math.random() * mutTypes.length)], duration: 8000, startTime: now });
          p.shielded = p.mutations.some((m) => m.type === "shield");
        }
      }
      break;
    case "monad_surge":
      state.eventAnnouncement = "💜 MONAD SURGE — MON EVERYWHERE";
      state.eventAnnouncementEnd = now + 3000;
      spawnMonCrystals(state, 20);
      break;
    case "gravity_flip":
      state.eventAnnouncement = "🔄 GRAVITY FLIPPED";
      state.eventAnnouncementEnd = now + 3000;
      state.gravityFlipped = true;
      setTimeout(() => { state.gravityFlipped = false; }, 7000);
      break;
  }
  state.lastEventTime = now;
}
