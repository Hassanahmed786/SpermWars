/**
 * ════════════════════════════════════════════════════════════════════
 *  PERSONA ROSTER — parody characters
 * ════════════════════════════════════════════════════════════════════
 *
 * DESIGN NOTE (important):
 *   The 6 gameplay archetypes in `game-config.ts` (space / politician /
 *   ai / crypto / scientist / chaos) are the ONLY things the physics and
 *   ability code knows about. They are deliberately left untouched.
 *
 *   A "persona" is a cosmetic + comedic skin that maps onto one of those
 *   archetypes through `baseId`. That means we can ship 20+ characters
 *   without changing a single line of balance, collision or ability logic.
 *
 * LEGAL / EDITORIAL NOTE:
 *   These are ORIGINAL FICTIONAL CHARACTERS built on widely-recognised
 *   *archetypes* (a formal head of government, a bombastic showman, a
 *   space-and-EV tycoon, an AI lab boss, a coin maximalist…).
 *
 *   `parodyOf` therefore describes the ARCHETYPE, never a named living
 *   person. No real individual is named, depicted, or implied to endorse,
 *   sponsor, or participate in this game. No real photographs are used —
 *   every character is drawn procedurally as a cartoon sperm.
 */

export type PersonaCategory = "POLITICS" | "TECH" | "BLOCKCHAIN" | "INTERNET" | "CHAOS";

/** One of the six gameplay archetypes defined in game-config.ts */
export type BaseArchetype = "space" | "politician" | "ai" | "crypto" | "scientist" | "chaos";

export interface Persona {
  id: string;
  name: string;
  /** Short archetype description — never a real person's name. */
  parodyOf: string;
  role: string;
  category: PersonaCategory;
  /** Which gameplay archetype drives stats + ability. */
  baseId: BaseArchetype;
  /** Accessory key consumed by sperm-art.ts */
  accessory: string;
  color: string;
  emoji: string;
  personality: string;
  /** One-liner shown under the name in the picker. */
  tagline: string;
  /** Signature hover animation hint used by the picker. */
  signature: "boost" | "spin" | "pulse" | "wobble" | "charge";
}

export const PERSONAS: Persona[] = [
  /* ─────────────── POLITICS ─────────────── */
  {
    id: "prime_swimmer",
    name: "PRIME SWIMMER",
    parodyOf: "Formal head-of-government archetype",
    role: "The Statesman",
    category: "POLITICS",
    baseId: "politician",
    accessory: "sash",
    color: "#ff9933",
    emoji: "🏛️",
    personality: "Composed, ceremonial, always on message.",
    tagline: "Announces a new swimming policy every lap.",
    signature: "pulse",
  },
  {
    id: "swimmer_in_chief",
    name: "SWIMMER-IN-CHIEF",
    parodyOf: "Bombastic showman-politician archetype",
    role: "The Showman",
    category: "POLITICS",
    baseId: "politician",
    accessory: "tie",
    color: "#e63946",
    emoji: "🇺🇸",
    personality: "Loud, confident, superlatives only.",
    tagline: "Every swim is the best swim. Believe it.",
    signature: "pulse",
  },
  {
    id: "right_honourable",
    name: "THE RIGHT HONOURABLE",
    parodyOf: "Buttoned-up parliamentary archetype",
    role: "The Diplomat",
    category: "POLITICS",
    baseId: "politician",
    accessory: "bowler",
    color: "#4a6fa5",
    emoji: "☂️",
    personality: "Painfully polite. Quietly ruthless.",
    tagline: "Terribly sorry about the knockback.",
    signature: "wobble",
  },
  {
    id: "politician",
    name: "POLITICIAN SPERM",
    parodyOf: "Generic career-politician archetype",
    role: "The Original",
    category: "POLITICS",
    baseId: "politician",
    accessory: "tie",
    color: "#ff6b35",
    emoji: "📜",
    personality: "Legislates mid-swim.",
    tagline: "New law just dropped.",
    signature: "pulse",
  },

  /* ─────────────── TECH ─────────────── */
  {
    id: "mars_mogul",
    name: "MARS MOGUL",
    parodyOf: "Space-and-electric-vehicle tycoon archetype",
    role: "The Rocketeer",
    category: "TECH",
    baseId: "space",
    accessory: "helmet",
    color: "#00d4ff",
    emoji: "🚀",
    personality: "Ships fast. Occasionally explodes.",
    tagline: "First we swim. Then we colonize.",
    signature: "boost",
  },
  {
    id: "ai_overlord",
    name: "AI OVERLORD",
    parodyOf: "Frontier-AI-lab boss archetype",
    role: "The Model",
    category: "TECH",
    baseId: "ai",
    accessory: "antenna",
    color: "#39ff14",
    emoji: "🤖",
    personality: "Calm. Certain. Slightly ominous.",
    tagline: "This outcome was in the training data.",
    signature: "spin",
  },
  {
    id: "tech_bro",
    name: "TECH BRO",
    parodyOf: "Startup-founder archetype",
    role: "The Disruptor",
    category: "TECH",
    baseId: "ai",
    accessory: "hoodie",
    color: "#7ae0ff",
    emoji: "💻",
    personality: "Everything is a feature.",
    tagline: "We're pre-revenue but post-vibes.",
    signature: "wobble",
  },
  {
    id: "space",
    name: "SPACE SPERM",
    parodyOf: "Classic astronaut archetype",
    role: "The Original",
    category: "TECH",
    baseId: "space",
    accessory: "helmet",
    color: "#4fc3f7",
    emoji: "🧑‍🚀",
    personality: "To the egg, and beyond.",
    tagline: "Rocket boost engaged.",
    signature: "boost",
  },
  {
    id: "ai",
    name: "AI SPERM",
    parodyOf: "Classic robot archetype",
    role: "The Original",
    category: "TECH",
    baseId: "ai",
    accessory: "antenna",
    color: "#39ff14",
    emoji: "⚙️",
    personality: "Deploys clones without asking.",
    tagline: "Compute acquired.",
    signature: "spin",
  },

  /* ─────────────── BLOCKCHAIN ─────────────── */
  {
    id: "monad_maxi",
    name: "MONAD MAXI",
    parodyOf: "Parallel-execution enthusiast archetype",
    role: "⭐ Flagship",
    category: "BLOCKCHAIN",
    baseId: "chaos",
    accessory: "monadhalo",
    color: "#836ef9",
    emoji: "🟣",
    personality: "Does everything simultaneously.",
    tagline: "Executed the whole race in parallel.",
    signature: "charge",
  },
  {
    id: "bitcoin_maxi",
    name: "BITCOIN MAXI",
    parodyOf: "Single-asset maximalist archetype",
    role: "The Believer",
    category: "BLOCKCHAIN",
    baseId: "crypto",
    accessory: "btccoin",
    color: "#f7931a",
    emoji: "🟠",
    personality: "There is only one egg.",
    tagline: "Has not sold. Will not sell.",
    signature: "pulse",
  },
  {
    id: "defi_degen",
    name: "DEFI DEGEN",
    parodyOf: "High-risk trading culture archetype",
    role: "The Gambler",
    category: "BLOCKCHAIN",
    baseId: "crypto",
    accessory: "shades",
    color: "#ffd700",
    emoji: "🐸",
    personality: "Aped in without reading anything.",
    tagline: "Down bad, still early.",
    signature: "wobble",
  },
  {
    id: "chain_builder",
    name: "BLOCKCHAIN BUILDER",
    parodyOf: "Protocol-engineer archetype",
    role: "The Shipper",
    category: "BLOCKCHAIN",
    baseId: "scientist",
    accessory: "hardhat",
    color: "#5cff8f",
    emoji: "🧠",
    personality: "It compiles, therefore it works.",
    tagline: "Deployed straight to production.",
    signature: "charge",
  },
  {
    id: "crypto",
    name: "CRYPTO SPERM",
    parodyOf: "Generic crypto-trader archetype",
    role: "The Original",
    category: "BLOCKCHAIN",
    baseId: "crypto",
    accessory: "shades",
    color: "#ffd166",
    emoji: "💰",
    personality: "Magnetically attracted to MON.",
    tagline: "Buy the dip. Then buy the egg.",
    signature: "pulse",
  },

  /* ─────────────── INTERNET ─────────────── */
  {
    id: "pop_star",
    name: "POP STAR",
    parodyOf: "Chart-topping performer archetype",
    role: "The Headliner",
    category: "INTERNET",
    baseId: "chaos",
    accessory: "mic",
    color: "#ff4fa3",
    emoji: "🎤",
    personality: "Turns every lap into a stadium tour.",
    tagline: "This swim is going number one.",
    signature: "spin",
  },
  {
    id: "football_legend",
    name: "FOOTBALL LEGEND",
    parodyOf: "Star-striker archetype",
    role: "The Finisher",
    category: "INTERNET",
    baseId: "space",
    accessory: "headband",
    color: "#5cff8f",
    emoji: "⚽",
    personality: "Celebrates before crossing the line.",
    tagline: "Nobody finishes like this.",
    signature: "boost",
  },
  {
    id: "movie_star",
    name: "MOVIE STAR",
    parodyOf: "Leading-actor archetype",
    role: "The Lead",
    category: "INTERNET",
    baseId: "politician",
    accessory: "starshades",
    color: "#e0aaff",
    emoji: "🎬",
    personality: "Always finds the camera.",
    tagline: "Doing all my own swimming stunts.",
    signature: "wobble",
  },
  {
    id: "gamer",
    name: "GAMER",
    parodyOf: "Competitive-streamer archetype",
    role: "The Sweat",
    category: "INTERNET",
    baseId: "ai",
    accessory: "headset",
    color: "#b388ff",
    emoji: "🎮",
    personality: "Has 4000 hours in this canal.",
    tagline: "Clipped it. Posting it.",
    signature: "spin",
  },

  /* ─────────────── CHAOS ─────────────── */
  {
    id: "mad_scientist",
    name: "MAD SCIENTIST",
    parodyOf: "Unhinged-inventor archetype",
    role: "The Experiment",
    category: "CHAOS",
    baseId: "scientist",
    accessory: "goggles",
    color: "#bf5fff",
    emoji: "🧪",
    personality: "Every outcome was intentional.",
    tagline: "The mutation is a feature.",
    signature: "charge",
  },
  {
    id: "scientist",
    name: "SCIENTIST SPERM",
    parodyOf: "Lab-researcher archetype",
    role: "The Original",
    category: "CHAOS",
    baseId: "scientist",
    accessory: "goggles",
    color: "#c77dff",
    emoji: "🔬",
    personality: "Peer reviews your swim.",
    tagline: "Hypothesis: I win.",
    signature: "charge",
  },
  {
    id: "chaos",
    name: "CHAOS SPERM",
    parodyOf: "Pure-agent-of-chaos archetype",
    role: "The Original",
    category: "CHAOS",
    baseId: "chaos",
    accessory: "jester",
    color: "#ff1493",
    emoji: "🌀",
    personality: "Has no idea what it is doing.",
    tagline: "Absolute cinema, every time.",
    signature: "spin",
  },
];

/* ── Lookups ─────────────────────────────────────────────────────── */

const BY_ID = new Map(PERSONAS.map((p) => [p.id, p]));

export function getPersona(id: string): Persona | undefined {
  return BY_ID.get(id);
}

/** Resolve any persona id to its gameplay archetype id. Base ids pass through. */
export function resolveBaseId(id: string): BaseArchetype {
  const p = BY_ID.get(id);
  if (p) return p.baseId;
  // already a base archetype (or unknown → safe default)
  const bases: BaseArchetype[] = ["space", "politician", "ai", "crypto", "scientist", "chaos"];
  return (bases as string[]).includes(id) ? (id as BaseArchetype) : "space";
}

export const CATEGORIES: PersonaCategory[] = [
  "POLITICS", "TECH", "BLOCKCHAIN", "INTERNET", "CHAOS",
];

export function personasByCategory(cat: PersonaCategory): Persona[] {
  return PERSONAS.filter((p) => p.category === cat);
}

/** Accessory map consumed by sperm-art.ts so personas render correctly. */
export const PERSONA_ACCESSORIES: Record<string, string> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p.accessory])
);
