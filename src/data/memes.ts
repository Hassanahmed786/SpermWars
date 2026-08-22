/**
 * Memes are organised by CHARACTER × EVENT × optional CATEGORY.
 * Pure data — the engine in src/lib/meme-engine.ts picks a line at the right
 * moment. Everything here is ORIGINAL text — no copyrighted material.
 */

export type CharacterId =
  | "space" | "politician" | "ai" | "crypto" | "scientist" | "chaos" | "any";

export type Category =
  | "political" | "web3" | "sports" | "gaming" | "internet" | "ai"
  | "crypto" | "fail" | "comeback" | "victory" | "chaos";

export type Event =
  | "win" | "lose" | "kill" | "die" | "die_near_egg" | "die_immediately"
  | "use_blast" | "use_ability" | "boost" | "collect_mon" | "big_money"
  | "low_health" | "final_swim" | "match_found" | "join_room"
  | "combo_milestone" | "anypercent_speedrun";

export interface MemeLine {
  text: string;
  category: Category;
  /** slight emoji to anchor the read */
  icon?: string;
  /** intensity: 1 = subtle, 2 = big moment, 3 = legendary */
  flair?: 1 | 2 | 3;
}

/** A loose bag of lines keyed by event. `_default` is the fallback pool. */
export interface MemeBag {
  _default?: MemeLine[];
  [event: string]: MemeLine[] | undefined;
}

/** Per-character bag of memes. */
export type MemeTable = Record<CharacterId, MemeBag>;

/* ── SPACE SPERM ── "rocket" archetype */
const space: MemeBag = {
  _default: [
    { text: "TO MARS WE GO.", category: "internet", icon: "🚀", flair: 2 },
    { text: "MISSION ACCOMPLISHED.", category: "victory", icon: "🧑‍🚀", flair: 2 },
    { text: "Houston, we have a problem.", category: "fail", icon: "🛰️" },
  ],
  win:  [{ text: "THE EGG IS GOING TO MARS.", category: "web3", icon: "🥚🚀", flair: 3 }],
  lose: [{ text: "MISSION FAILED. RETURNING TO EARTH.", category: "fail", icon: "🌍", flair: 2 }],
  use_blast: [
    { text: "WE'RE GOING TO NEED A BIGGER BOAT.", category: "internet", icon: "🛰️", flair: 2 },
  ],
  die_immediately: [
    { text: "ROCKET BOOM.", category: "fail", icon: "💥" },
  ],
  big_money: [
    { text: "FUNDING SECURED.", category: "web3", icon: "💸", flair: 2 },
  ],
};

/* ── POLITICIAN ── parody archetypes: PRIME SWIMMER / THE SWIMMER-IN-CHIEF */
const politician: MemeBag = {
  _default: [
    { text: "THE PEOPLE HAVE SPOKEN.", category: "political", icon: "🏛️", flair: 2 },
    { text: "WE ARE REVIEWING THE RESULTS.", category: "political", icon: "🗳️" },
    { text: "NEW LAW JUST DROPPED.", category: "political", icon: "📜", flair: 2 },
    { text: "A NEW SWIM IS NEEDED.", category: "political", icon: "🌊" },
  ],
  win:  [
    { text: "WE WON. VERY WIN. WE'RE WINNING.", category: "political", icon: "🏆", flair: 3 },
    { text: "THE PEOPLE HAVE CHOSEN.", category: "political", icon: "👑", flair: 3 },
  ],
  lose: [
    { text: "WE ARE REVIEWING THE RESULTS.", category: "political", icon: "🗳️" },
    { text: "FRAUD. OBVIOUSLY.", category: "political", icon: "📜" },
  ],
  use_ability: [
    { text: "NEW LAW JUST DROPPED.", category: "political", icon: "📜", flair: 2 },
  ],
  die_near_egg: [
    { text: "WE WERE SO CLOSE TO THE FINISH LINE.", category: "fail", icon: "🗳️", flair: 2 },
  ],
  anypercent_speedrun: [
    { text: "MANDATE OF THE PEOPLE WAS RESOUNDING.", category: "political", icon: "🏆" },
  ],
};

/* ── AI SPERM ── "AI OVERLORD" */
const ai: MemeBag = {
  _default: [
    { text: "THE ALGORITHM HAS SPOKEN.", category: "ai", icon: "🤖" },
    { text: "INITIALISING VICTORY...", category: "ai", icon: "💻" },
    { text: "ERROR 404: WINNER NOT FOUND.", category: "fail", icon: "⚠️" },
  ],
  win: [
    { text: "THE MODEL PREDICTED THIS.", category: "ai", icon: "🧠", flair: 3 },
    { text: "ABSOLUTE CINEMA.", category: "internet", icon: "🎬", flair: 2 },
  ],
  lose: [
    { text: "ERROR 404: WINNER NOT FOUND.", category: "fail", icon: "⚠️" },
  ],
  use_ability: [
    { text: "DEPLOYING CLONE IN 3... 2... 1...", category: "ai", icon: "🤖" },
  ],
  die_immediately: [
    { text: "PREDICTION CONFIDENCE: LOW.", category: "fail", icon: "🤖" },
  ],
};

/* ── CRYPTO ── "COIN LORD" */
const crypto: MemeBag = {
  _default: [
    { text: "BUY THE DIP.", category: "crypto", icon: "📉" },
    { text: "WE'RE SO EARLY.", category: "crypto", icon: "🚀" },
    { text: "NGMI.", category: "crypto", icon: "📉" },
    { text: "WAGMI.", category: "crypto", icon: "🟢" },
  ],
  win: [
    { text: "WE'RE SO EARLY.", category: "crypto", icon: "🚀", flair: 3 },
    { text: "NUMBER GO UP.", category: "crypto", icon: "📈", flair: 2 },
  ],
  lose: [
    { text: "NGMI.", category: "crypto", icon: "📉" },
    { text: "HONEYBADGER. WE WILL BE BACK.", category: "internet", icon: "🐻" },
  ],
  collect_mon: [
    { text: "BUY THE DIP.", category: "crypto", icon: "💰" },
  ],
  big_money: [
    { text: "Bro found the liquidity.", category: "crypto", icon: "💎", flair: 2 },
  ],
  use_blast: [
    { text: "JUST PAID GAS TO SEND EVERYONE FLYING.", category: "web3", icon: "⛽", flair: 2 },
  ],
};

/* ── SCIENTIST ── "mad scientist" */
const scientist: MemeBag = {
  _default: [
    { text: "THIS WAS COMPLETELY INTENTIONAL.", category: "gaming", icon: "🧪" },
    { text: "EXPERIMENT 47-E: SUCCESS.", category: "gaming", icon: "🔬" },
  ],
  win: [
    { text: "PUBLISHED IN NATURE TOMORROW.", category: "gaming", icon: "🧪", flair: 2 },
  ],
  use_ability: [
    { text: "MUTATION LEVEL: SPICY.", category: "gaming", icon: "🧬", flair: 2 },
  ],
  lose: [
    { text: "PEER REVIEWED. PEER REJECTED.", category: "gaming", icon: "📝" },
  ],
};

/* ── CHAOS ── "absolute cinema" */
const chaos: MemeBag = {
  _default: [
    { text: "I HAVE NO IDEA WHAT I'M DOING.", category: "chaos", icon: "🌀" },
    { text: "ABSOLUTE CINEMA.", category: "internet", icon: "🎬", flair: 2 },
    { text: "LOCK IN.", category: "internet", icon: "🔒" },
    { text: "WHAT ARE WE DOING 😭", category: "internet", icon: "🌀" },
  ],
  win: [
    { text: "ABSOLUTE CINEMA.", category: "victory", icon: "🎬", flair: 3 },
    { text: "WE'RE SO BACK.", category: "internet", icon: "🌀", flair: 2 },
  ],
  lose: [
    { text: "I HAVE NO IDEA WHAT I'M DOING.", category: "chaos", icon: "🌀" },
  ],
  die_near_egg: [
    { text: "99.9% COMPLETE 💀", category: "fail", icon: "💀", flair: 2 },
  ],
  use_blast: [
    { text: "THAT WAS DEFINITELY INTENTIONAL.", category: "chaos", icon: "🌀" },
  ],
  anypercent_speedrun: [
    { text: "A+ ROUTE.", category: "gaming", icon: "🏃", flair: 2 },
  ],
};

/* ── Generics for "any" character when an archetype-specific line isn't set ── */
const any: MemeBag = {
  _default: [],
  win: [
    { text: "THE PLOT ARMOR IS INSANE.", category: "comeback", icon: "🛡️", flair: 2 },
    { text: "MAIN CHARACTER ENERGY.", category: "victory", icon: "👑" },
    { text: "ABSOLUTE CINEMA.", category: "victory", icon: "🎬", flair: 2 },
  ],
  lose: [
    { text: "Bro swam all that way for THIS 💀", category: "fail", icon: "💀" },
    { text: "Natural selection has entered the chat.", category: "fail", icon: "🧬" },
  ],
  die_near_egg: [
    { text: "99.9% COMPLETE 💀", category: "fail", icon: "💀", flair: 2 },
  ],
  die_immediately: [
    { text: "ANY% SPEEDRUN.", category: "gaming", icon: "⚡", flair: 2 },
    { text: "IT'S OVER.", category: "internet", icon: "🪦" },
  ],
  kill: [
    { text: "AND HE'S GONE 💀", category: "gaming", icon: "💀" },
  ],
  use_blast: [
    { text: "BRO JUST PAID GAS TO SEND EVERYONE FLYING 💀", category: "web3", icon: "⛽", flair: 2 },
  ],
  boost: [
    { text: "BRO IS COOKING.", category: "gaming", icon: "🍳", flair: 2 },
  ],
  collect_mon: [
    { text: "Tax season came early.", category: "internet", icon: "🧾" },
  ],
  big_money: [
    { text: "Bro found the liquidity.", category: "crypto", icon: "💎", flair: 2 },
  ],
  low_health: [
    { text: "THE PLOT ARMOR.", category: "comeback", icon: "🛡️" },
  ],
  final_swim: [
    { text: "THE FINAL SWIM.", category: "victory", icon: "🥚", flair: 2 },
  ],
  match_found: [
    { text: "THE EGG IS WAITING.", category: "victory", icon: "🥚" },
  ],
  join_room: [
    { text: "ANOTHER SWIMMER ENTERS THE CHAT.", category: "internet", icon: "💬" },
  ],
  combo_milestone: [
    { text: "BRO IS ON A HEATER 🔥", category: "gaming", icon: "🔥", flair: 2 },
  ],
  use_ability: [
    { text: "BUTTON SMASHER 🌀", category: "gaming", icon: "🌀" },
  ],
};

export const MEMES: MemeTable = { space, politician, ai, crypto, scientist, chaos, any };
