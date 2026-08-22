// Character definitions and game configuration

export interface CharacterDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  glowColor: string;
  theme: string;
  abilityName: string;
  abilityKey: string;
  abilityCooldown: number;
  abilityDuration: number;
  abilityCost: number;
  description: string;
  baseSpeed: number;
  baseHealth: number;
  baseEnergy: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "space",
    name: "Space Sperm",
    emoji: "🚀",
    color: "#00d4ff",
    glowColor: "#00d4ff88",
    theme: "Rocket/Space",
    abilityName: "ROCKET BOOST",
    abilityKey: "1",
    abilityCooldown: 8000,
    abilityDuration: 2000,
    abilityCost: 20,
    description: "Temporarily becomes extremely fast with a rocket flame trail",
    baseSpeed: 3.2,
    baseHealth: 100,
    baseEnergy: 100,
  },
  {
    id: "politician",
    name: "Politician Sperm",
    emoji: "🏛️",
    color: "#ff6b35",
    glowColor: "#ff6b3588",
    theme: "Politician",
    abilityName: "NEW LAW",
    abilityKey: "2",
    abilityCooldown: 12000,
    abilityDuration: 3000,
    abilityCost: 30,
    description: "Reverses movement for nearby opponents temporarily",
    baseSpeed: 2.8,
    baseHealth: 120,
    baseEnergy: 100,
  },
  {
    id: "ai",
    name: "AI Sperm",
    emoji: "🤖",
    color: "#39ff14",
    glowColor: "#39ff1488",
    theme: "Robot/AI",
    abilityName: "CLONE",
    abilityKey: "3",
    abilityCooldown: 15000,
    abilityDuration: 4000,
    abilityCost: 35,
    description: "Creates temporary mini sperm clones that attack nearby enemies",
    baseSpeed: 3.0,
    baseHealth: 90,
    baseEnergy: 120,
  },
  {
    id: "crypto",
    name: "Crypto Sperm",
    emoji: "💰",
    color: "#ffd700",
    glowColor: "#ffd70088",
    theme: "Crypto Billionaire",
    abilityName: "MON MAGNET",
    abilityKey: "4",
    abilityCooldown: 10000,
    abilityDuration: 3000,
    abilityCost: 25,
    description: "Attracts nearby MON energy crystals like a magnet",
    baseSpeed: 2.6,
    baseHealth: 110,
    baseEnergy: 110,
  },
  {
    id: "scientist",
    name: "Scientist Sperm",
    emoji: "🧪",
    color: "#bf5fff",
    glowColor: "#bf5fff88",
    theme: "Mad Scientist",
    abilityName: "MUTATE",
    abilityKey: "5",
    abilityCooldown: 18000,
    abilityDuration: 5000,
    abilityCost: 40,
    description: "Gets one random temporary mutation (speed, size, damage, or shield)",
    baseSpeed: 2.9,
    baseHealth: 95,
    baseEnergy: 130,
  },
  {
    id: "chaos",
    name: "Chaos Sperm",
    emoji: "🌀",
    color: "#ff1493",
    glowColor: "#ff149388",
    theme: "Unpredictable",
    abilityName: "CHAOS",
    abilityKey: "6",
    abilityCooldown: 10000,
    abilityDuration: 3000,
    abilityCost: 30,
    description: "Triggers a random powerful effect - could be anything!",
    baseSpeed: 3.1,
    baseHealth: 100,
    baseEnergy: 100,
  },
];

export const ARENA_SIZE = 2000;
export const EGG_RADIUS = 60;
export const EGG_POS = { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 };
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 1;
export const MATCH_DURATION = 120; // seconds
export const PLAYER_RADIUS = 18;
export const DASH_COOLDOWN = 2000;
export const DASH_SPEED = 8;
export const DASH_DURATION = 200;
export const MON_CRYSTAL_VALUE = 10;
export const KNOCKBACK_FORCE = 15;
export const DAMAGE_ON_HIT = 15;
export const ELIMINATION_THRESHOLD = 0; // health <= 0

export const RANDOM_EVENT_INTERVAL_MIN = 15000;
export const RANDOM_EVENT_INTERVAL_MAX = 30000;
export const PARALLEL_EVENT_INTERVAL = 25000;

export const MONAD_BLAST_COST = 0.001;
export const MONAD_BLAST_RADIUS = 200;
export const MONAD_BLAST_KNOCKBACK = 25;

export type RandomEventType = "immune_attack" | "fluid_surge" | "mutation_storm" | "monad_surge" | "gravity_flip";

export interface RandomEvent {
  type: RandomEventType;
  name: string;
  icon: string;
  duration: number;
  announcement: string;
}

export const RANDOM_EVENTS: RandomEvent[] = [
  {
    type: "immune_attack",
    name: "Immune Attack",
    icon: "🛡️",
    duration: 8000,
    announcement: "⚠️ IMMUNE SYSTEM ACTIVATED",
  },
  {
    type: "fluid_surge",
    name: "Fluid Surge",
    icon: "🌊",
    duration: 6000,
    announcement: "🌊 FLUID SURGE INCOMING",
  },
  {
    type: "mutation_storm",
    name: "Mutation Storm",
    icon: "🧬",
    duration: 5000,
    announcement: "🧬 MUTATION STORM",
  },
  {
    type: "monad_surge",
    name: "Monad Surge",
    icon: "💜",
    duration: 4000,
    announcement: "💜 MONAD SURGE — MON EVERYWHERE",
  },
  {
    type: "gravity_flip",
    name: "Gravity Flip",
    icon: "🔄",
    duration: 7000,
    announcement: "🔄 GRAVITY FLIPPED",
  },
];

export type MutationType = "speed" | "giant" | "damage" | "shield" | "magnet";

export interface Mutation {
  type: MutationType;
  duration: number;
  startTime: number;
}

export type ParallelChoice = "boost" | "attack" | "defend" | "mutate";

/* ════════════════════════════════════════════════════════════════════
   PERSONA RESOLUTION
   ════════════════════════════════════════════════════════════════════
   The six CHARACTERS above remain the ONLY gameplay archetypes. Personas
   (src/data/roster.ts) are cosmetic skins that map onto them via baseId.

   `getCharacterDef` returns a def whose *gameplay* fields (speed, health,
   energy, ability timings) always come from the base archetype, while the
   *display* fields (name, colour, emoji) come from the persona. That means
   personas render with their own identity everywhere while balance,
   collision and ability behaviour stay byte-for-byte identical.

   Passing a plain base id (e.g. "space") returns the untouched base def,
   so every existing call site keeps its current behaviour.
   ════════════════════════════════════════════════════════════════════ */

import { getPersona, resolveBaseId } from "@/data/roster";

const BASE_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

/** Look up a playable character def by persona id OR base archetype id. */
export function getCharacterDef(id: string | undefined | null): CharacterDef {
  if (!id) return CHARACTERS[0];

  const direct = BASE_BY_ID.get(id);
  const persona = getPersona(id);
  if (!persona) return direct ?? CHARACTERS[0];

  const base = BASE_BY_ID.get(persona.baseId) ?? CHARACTERS[0];
  return {
    ...base,                      // gameplay: speed / health / energy / ability timings
    id: persona.id,
    name: persona.name,
    emoji: persona.emoji,
    color: persona.color,
    glowColor: `${persona.color}88`,
    theme: persona.role,
    description: persona.tagline,
  };
}

export { resolveBaseId };
