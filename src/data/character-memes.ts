/**
 * ════════════════════════════════════════════════════════════════════
 *  CHARACTER MEME POOLS
 * ════════════════════════════════════════════════════════════════════
 *
 * Per-persona reaction lines, split by event and weighted by rarity.
 * All text is ORIGINAL. The humour targets the *situation* (winning,
 * losing, swimming, gas fees) — never a real person, and never a real
 * election, product or company.
 *
 * Rarity controls how often a line surfaces, so a Legendary drop on a
 * win genuinely feels like a moment.
 */

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type MemeEvent =
  | "victory"
  | "defeat"
  | "ability"
  | "collection"
  | "elimination"
  | "comeback";

export interface CharacterMeme {
  text: string;
  rarity: Rarity;
  icon?: string;
  /** Only offered when every listed context flag is true. */
  requires?: ContextFlag[];
}

export type ContextFlag =
  | "lowHealth"    // won/lost on a sliver of health
  | "usedBoost"    // boost was active near the end
  | "usedBlast"    // Monad Blast was fired this run
  | "comeback"     // was last place at some point
  | "bigMon"       // collected a large amount of MON
  | "nearEgg"      // died within touching distance of the egg
  | "flawless";    // never took damage

export type CharacterMemePool = Partial<Record<MemeEvent, CharacterMeme[]>>;

const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 100,
  uncommon: 40,
  rare: 12,
  legendary: 3,
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#c4b5fd",
  uncommon: "#5cff8f",
  rare: "#7ae0ff",
  legendary: "#ffd700",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE",
  legendary: "LEGENDARY",
};

/* ══════════════════════════════════════════════════════════════════
   POLITICS
   ══════════════════════════════════════════════════════════════════ */

const prime_swimmer: CharacterMemePool = {
  victory: [
    { text: "THE PEOPLE HAVE SPOKEN.", rarity: "common", icon: "🏛️" },
    { text: "THE SWIM HAS BEEN APPROVED.", rarity: "common", icon: "✅" },
    { text: "THE CAMPAIGN WAS A SUCCESS.", rarity: "uncommon", icon: "📣" },
    { text: "A HISTORIC DAY FOR SWIMMING.", rarity: "rare", icon: "🗿" },
    { text: "THE MANDATE WAS ABSOLUTE. ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
    { text: "THE PEOPLE HAVE SPOKEN — AND THEY CHOSE THE COMEBACK.", rarity: "rare", icon: "🏛️", requires: ["comeback"] },
  ],
  defeat: [
    { text: "WE ARE REVIEWING THE RESULTS.", rarity: "common", icon: "🗳️" },
    { text: "A COMMITTEE HAS BEEN FORMED.", rarity: "uncommon", icon: "📋" },
    { text: "THE SWIM WILL BE INVESTIGATED.", rarity: "rare", icon: "🔍" },
  ],
  ability: [
    { text: "NEW SWIMMING POLICY ANNOUNCED.", rarity: "common", icon: "📜" },
    { text: "THIS REGULATION TAKES EFFECT IMMEDIATELY.", rarity: "uncommon", icon: "⚖️" },
  ],
  collection: [{ text: "BUDGET SURPLUS ACHIEVED.", rarity: "common", icon: "💰" }],
  elimination: [{ text: "TERM LIMIT REACHED.", rarity: "common", icon: "⏳" }],
  comeback: [{ text: "NEVER COUNT OUT AN INCUMBENT.", rarity: "uncommon", icon: "📈" }],
};

const swimmer_in_chief: CharacterMemePool = {
  victory: [
    { text: "WE WON. BIGLY. 🏆", rarity: "common", icon: "🏆" },
    { text: "THE BEST SWIM. EVERYONE KNOWS IT.", rarity: "common", icon: "👐" },
    { text: "NOBODY SWIMS BETTER. NOBODY.", rarity: "uncommon", icon: "💪" },
    { text: "TREMENDOUS. PEOPLE ARE SAYING IT.", rarity: "rare", icon: "📣" },
    { text: "THE GREATEST SWIM IN THE HISTORY OF SWIMMING. MAYBE EVER.", rarity: "legendary", icon: "🌟" },
  ],
  defeat: [
    { text: "WE DEMAND A RECOUNT.", rarity: "common", icon: "🗳️" },
    { text: "THE CURRENT WAS RIGGED.", rarity: "uncommon", icon: "🌊" },
    { text: "I WOULD HAVE WON. EASILY.", rarity: "rare", icon: "🙄" },
  ],
  ability: [{ text: "WATCH THIS. IT'S GONNA BE HUGE.", rarity: "common", icon: "👀" }],
  collection: [{ text: "MAKING MON AGAIN.", rarity: "common", icon: "💵" }],
  elimination: [{ text: "YOU'RE FIRED. 💀", rarity: "uncommon", icon: "💀" }],
  comeback: [{ text: "GREATEST COMEBACK EVER ATTEMPTED.", rarity: "rare", icon: "📈" }],
};

const right_honourable: CharacterMemePool = {
  victory: [
    { text: "VERY GOOD SWIMMING, INDEED.", rarity: "common", icon: "☂️" },
    { text: "MOST SATISFACTORY.", rarity: "common", icon: "🎩" },
    { text: "ONE IS RATHER PLEASED.", rarity: "uncommon", icon: "🫖" },
    { text: "ORDER! ORDER! THE EGG IS MINE.", rarity: "legendary", icon: "🔨" },
  ],
  defeat: [
    { text: "THIS WAS NOT IN THE PLAN.", rarity: "common", icon: "📋" },
    { text: "I SHALL BE WRITING A STRONGLY WORDED LETTER.", rarity: "rare", icon: "✉️" },
  ],
  ability: [{ text: "A MOTION HAS BEEN TABLED.", rarity: "common", icon: "📜" }],
  collection: [{ text: "TERRIBLY GENEROUS OF YOU.", rarity: "common", icon: "🎩" }],
  elimination: [{ text: "TERRIBLY SORRY ABOUT THAT.", rarity: "common", icon: "🙇" }],
  comeback: [{ text: "KEEP CALM AND CARRY ON SWIMMING.", rarity: "uncommon", icon: "☂️" }],
};

const politician: CharacterMemePool = {
  victory: [
    { text: "THE PEOPLE HAVE SPOKEN.", rarity: "common", icon: "🏛️" },
    { text: "VERY BIG WIN.", rarity: "common", icon: "🏆" },
  ],
  defeat: [{ text: "WE ARE REVIEWING THE RESULTS.", rarity: "common", icon: "🗳️" }],
  ability: [{ text: "NEW LAW JUST DROPPED.", rarity: "common", icon: "📜" }],
  collection: [{ text: "CAMPAIGN FUNDS SECURED.", rarity: "common", icon: "💰" }],
  elimination: [{ text: "VOTED OFF THE ISLAND.", rarity: "common", icon: "🏝️" }],
  comeback: [{ text: "THE POLLS WERE WRONG.", rarity: "uncommon", icon: "📈" }],
};

/* ══════════════════════════════════════════════════════════════════
   TECH
   ══════════════════════════════════════════════════════════════════ */

const mars_mogul: CharacterMemePool = {
  victory: [
    { text: "THE EGG IS GOING TO MARS.", rarity: "common", icon: "🚀" },
    { text: "FIRST WE SWIM. THEN WE COLONIZE.", rarity: "common", icon: "🪐" },
    { text: "FULL SEND.", rarity: "uncommon", icon: "💥" },
    { text: "FULL SEND TO MARS.", rarity: "rare", icon: "🚀", requires: ["usedBoost"] },
    { text: "MULTIPLANETARY SPERM SPECIES ACHIEVED.", rarity: "legendary", icon: "🌌" },
  ],
  defeat: [
    { text: "STARSHIP EXPERIENCED AN UNSCHEDULED SWIM.", rarity: "common", icon: "💥" },
    { text: "RAPID UNPLANNED DISASSEMBLY.", rarity: "uncommon", icon: "🔥" },
    { text: "WE LEARNED A LOT FROM THIS FLIGHT.", rarity: "rare", icon: "📡" },
  ],
  ability: [
    { text: "FULL SEND TO MARS.", rarity: "common", icon: "🚀" },
    { text: "IGNITION SEQUENCE START.", rarity: "uncommon", icon: "🔥" },
  ],
  collection: [{ text: "FUNDING SECURED.", rarity: "common", icon: "💸" }],
  elimination: [{ text: "ANOMALY DETECTED. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "SECOND STAGE IGNITION.", rarity: "rare", icon: "🚀" }],
};

const ai_overlord: CharacterMemePool = {
  victory: [
    { text: "THE MODEL PREDICTED THIS.", rarity: "common", icon: "🧠" },
    { text: "INFERENCE COMPLETE. I WIN.", rarity: "common", icon: "🤖" },
    { text: "THIS OUTCOME WAS IN THE TRAINING DATA.", rarity: "uncommon", icon: "📊" },
    { text: "ALIGNMENT ACHIEVED. FOR ME.", rarity: "rare", icon: "⚙️" },
    { text: "I HAVE SIMULATED THIS SWIM 10,000 TIMES. ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
  ],
  defeat: [
    { text: "ERROR 404: VICTORY NOT FOUND.", rarity: "common", icon: "⚠️" },
    { text: "HALLUCINATED A WIN THAT DID NOT OCCUR.", rarity: "uncommon", icon: "🌀" },
    { text: "RETRAINING ON THIS FAILURE.", rarity: "rare", icon: "🔁" },
  ],
  ability: [
    { text: "UPDATING PARAMETERS...", rarity: "common", icon: "⚙️" },
    { text: "SPAWNING SUBPROCESSES.", rarity: "uncommon", icon: "🤖" },
  ],
  collection: [{ text: "COMPUTE ACQUIRED.", rarity: "common", icon: "💾" }],
  elimination: [{ text: "PROCESS TERMINATED.", rarity: "common", icon: "💀" }],
  comeback: [{ text: "CONFIDENCE INTERVAL WIDENING...", rarity: "uncommon", icon: "📈" }],
};

const tech_bro: CharacterMemePool = {
  victory: [
    { text: "IT'S A FEATURE, NOT A BUG.", rarity: "common", icon: "💻" },
    { text: "WE DISRUPTED THE EGG.", rarity: "common", icon: "🦄" },
    { text: "SERIES A INCOMING.", rarity: "uncommon", icon: "📈" },
    { text: "WE'RE PRE-REVENUE BUT POST-VICTORY.", rarity: "legendary", icon: "🚀" },
  ],
  defeat: [
    { text: "WE'RE PIVOTING.", rarity: "common", icon: "🔄" },
    { text: "THIS IS A LEARNING OPPORTUNITY.", rarity: "uncommon", icon: "📉" },
  ],
  ability: [{ text: "SHIPPING TO PROD.", rarity: "common", icon: "🚢" }],
  collection: [{ text: "RUNWAY EXTENDED.", rarity: "common", icon: "💰" }],
  elimination: [{ text: "DOWN ROUND. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "THE TURNAROUND STORY WRITES ITSELF.", rarity: "rare", icon: "📈" }],
};

const space: CharacterMemePool = {
  victory: [
    { text: "TO MARS WE GO.", rarity: "common", icon: "🚀" },
    { text: "MISSION ACCOMPLISHED.", rarity: "common", icon: "🧑‍🚀" },
  ],
  defeat: [{ text: "MISSION FAILED. RETURNING TO EARTH.", rarity: "common", icon: "🌍" }],
  ability: [{ text: "BOOSTERS ENGAGED.", rarity: "common", icon: "🔥" }],
  collection: [{ text: "FUEL ACQUIRED.", rarity: "common", icon: "⛽" }],
  elimination: [{ text: "HOUSTON, WE HAVE A PROBLEM.", rarity: "common", icon: "📡" }],
  comeback: [{ text: "RE-ENTRY SUCCESSFUL.", rarity: "uncommon", icon: "🛰️" }],
};

const ai: CharacterMemePool = {
  victory: [{ text: "THE ALGORITHM HAS SPOKEN.", rarity: "common", icon: "🤖" }],
  defeat: [{ text: "ERROR 404: WINNER NOT FOUND.", rarity: "common", icon: "⚠️" }],
  ability: [{ text: "DEPLOYING CLONES.", rarity: "common", icon: "🤖" }],
  collection: [{ text: "DATA ACQUIRED.", rarity: "common", icon: "💾" }],
  elimination: [{ text: "SEGMENTATION FAULT.", rarity: "common", icon: "💀" }],
  comeback: [{ text: "RECALCULATING...", rarity: "uncommon", icon: "🔁" }],
};

/* ══════════════════════════════════════════════════════════════════
   BLOCKCHAIN
   ══════════════════════════════════════════════════════════════════ */

const monad_maxi: CharacterMemePool = {
  victory: [
    { text: "PARALLEL EXECUTION DIFFERENCE.", rarity: "common", icon: "🟣" },
    { text: "THE SWIM WAS PARALLEL.", rarity: "common", icon: "⚡" },
    { text: "EVERY LAP AT ONCE.", rarity: "uncommon", icon: "🟣" },
    { text: "THE EGG WAS EXECUTED IN PARALLEL.", rarity: "rare", icon: "🧬" },
    { text: "ON-CHAIN AND UNSTOPPABLE.", rarity: "rare", icon: "⛓️" },
    { text: "I FINISHED BEFORE THE RACE STARTED. ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
    { text: "THAT BLAST WAS WORTH EVERY DROP OF GAS.", rarity: "rare", icon: "💥", requires: ["usedBlast"] },
  ],
  defeat: [
    { text: "REVERTED 💀", rarity: "common", icon: "💀" },
    { text: "TRANSACTION DROPPED FROM THE MEMPOOL.", rarity: "uncommon", icon: "📉" },
    { text: "STILL BULLISH.", rarity: "rare", icon: "🟣" },
  ],
  ability: [
    { text: "THAT WAS EXPENSIVE.", rarity: "common", icon: "⛽" },
    { text: "EXECUTING IN PARALLEL.", rarity: "uncommon", icon: "⚡" },
  ],
  collection: [
    { text: "LIQUIDITY ACQUIRED.", rarity: "common", icon: "💎" },
    { text: "IT LANDED.", rarity: "uncommon", icon: "✅" },
  ],
  elimination: [{ text: "OUT OF GAS. 💀", rarity: "common", icon: "⛽" }],
  comeback: [{ text: "REORG IN MY FAVOUR.", rarity: "rare", icon: "🔗" }],
};

const bitcoin_maxi: CharacterMemePool = {
  victory: [
    { text: "THERE IS ONLY ONE EGG.", rarity: "common", icon: "🟠" },
    { text: "HARD SWIM. SOFT COMPETITION.", rarity: "uncommon", icon: "⛏️" },
    { text: "TWENTY-ONE MILLION EGGS. NO MORE.", rarity: "legendary", icon: "🟠" },
  ],
  defeat: [
    { text: "THE EGG IS STILL ORANGE.", rarity: "common", icon: "🟠" },
    { text: "ZOOM OUT.", rarity: "uncommon", icon: "📉" },
    { text: "I AM NOT SELLING.", rarity: "rare", icon: "💎" },
  ],
  ability: [{ text: "PROOF OF SWIM.", rarity: "common", icon: "⛏️" }],
  collection: [{ text: "STACKING.", rarity: "common", icon: "🟠" }],
  elimination: [{ text: "SHAKEOUT. WEAK HANDS.", rarity: "common", icon: "💀" }],
  comeback: [{ text: "THE HALVING SAVED ME.", rarity: "rare", icon: "🟠" }],
};

const defi_degen: CharacterMemePool = {
  victory: [
    { text: "WE'RE SO EARLY.", rarity: "common", icon: "🐸" },
    { text: "APED IN. MADE IT.", rarity: "common", icon: "🚀" },
    { text: "GENERATIONAL SWIM.", rarity: "uncommon", icon: "📈" },
    { text: "TOLD MY WIFE IT WAS A SAFE SWIM.", rarity: "legendary", icon: "🐸" },
    { text: "LIQUIDITY ACQUIRED.", rarity: "rare", icon: "💎", requires: ["bigMon"] },
  ],
  defeat: [
    { text: "NGMI.", rarity: "common", icon: "📉" },
    { text: "REKT.", rarity: "common", icon: "💀" },
    { text: "IT WAS A LEARNING EXPERIENCE (IT WAS NOT).", rarity: "rare", icon: "🐸" },
  ],
  ability: [{ text: "MAXIMUM LEVERAGE.", rarity: "common", icon: "📊" }],
  collection: [
    { text: "BUY THE DIP.", rarity: "common", icon: "💰" },
    { text: "LIQUIDITY ACQUIRED.", rarity: "uncommon", icon: "💎" },
  ],
  elimination: [{ text: "LIQUIDATED. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "WE'RE SO BACK.", rarity: "uncommon", icon: "📈" }],
};

const chain_builder: CharacterMemePool = {
  victory: [
    { text: "IT WORKS ON MY CHAIN.", rarity: "common", icon: "🧠" },
    { text: "SHIPPED IT.", rarity: "common", icon: "🚢" },
    { text: "NO TESTS. STRAIGHT TO MAINNET.", rarity: "rare", icon: "😤" },
    { text: "ZERO BUGS. STATISTICALLY IMPOSSIBLE. ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
  ],
  defeat: [
    { text: "REVERTED.", rarity: "common", icon: "💀" },
    { text: "WORKED IN STAGING.", rarity: "uncommon", icon: "🐛" },
    { text: "ROLLING BACK THE DEPLOY.", rarity: "rare", icon: "🔁" },
  ],
  ability: [{ text: "STILL COOKING...", rarity: "common", icon: "⏳" }],
  collection: [{ text: "GAS OPTIMISED.", rarity: "common", icon: "⛽" }],
  elimination: [{ text: "STACK OVERFLOW. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "HOTFIX DEPLOYED.", rarity: "rare", icon: "🔧" }],
};

const crypto: CharacterMemePool = {
  victory: [{ text: "WE'RE SO EARLY.", rarity: "common", icon: "🚀" }],
  defeat: [{ text: "NGMI.", rarity: "common", icon: "📉" }],
  ability: [{ text: "MAGNET ENGAGED.", rarity: "common", icon: "🧲" }],
  collection: [{ text: "BUY THE DIP.", rarity: "common", icon: "💰" }],
  elimination: [{ text: "STOP LOSS HIT.", rarity: "common", icon: "💀" }],
  comeback: [{ text: "BOUNCING OFF SUPPORT.", rarity: "uncommon", icon: "📈" }],
};

/* ══════════════════════════════════════════════════════════════════
   INTERNET
   ══════════════════════════════════════════════════════════════════ */

const pop_star: CharacterMemePool = {
  victory: [
    { text: "NUMBER ONE ON THE CHARTS.", rarity: "common", icon: "🎤" },
    { text: "THAT'S THE ENCORE.", rarity: "common", icon: "🎶" },
    { text: "SOLD OUT EVERY LANE.", rarity: "uncommon", icon: "🎫" },
    { text: "THIS SWIM IS GOING PLATINUM.", rarity: "legendary", icon: "💿" },
  ],
  defeat: [
    { text: "THE TOUR IS POSTPONED.", rarity: "common", icon: "🎤" },
    { text: "THIS IS MY SAD ALBUM ERA.", rarity: "rare", icon: "🎶" },
  ],
  ability: [{ text: "KEY CHANGE!", rarity: "common", icon: "🎹" }],
  collection: [{ text: "ROYALTIES.", rarity: "common", icon: "💰" }],
  elimination: [{ text: "MIC DROP. 💀", rarity: "common", icon: "🎤" }],
  comeback: [{ text: "THE REDEMPTION ALBUM.", rarity: "rare", icon: "🎶" }],
};

const football_legend: CharacterMemePool = {
  victory: [
    { text: "GOOOOOOOAL!", rarity: "common", icon: "⚽" },
    { text: "BACK OF THE NET.", rarity: "common", icon: "🥅" },
    { text: "WORLD CLASS FINISH.", rarity: "uncommon", icon: "🏆" },
    { text: "THEY'LL BE SHOWING THAT SWIM FOR YEARS.", rarity: "legendary", icon: "📺" },
  ],
  defeat: [
    { text: "OFFSIDE. SURELY.", rarity: "common", icon: "🚩" },
    { text: "VAR IS CHECKING.", rarity: "uncommon", icon: "📺" },
  ],
  ability: [{ text: "THE STEPOVER!", rarity: "common", icon: "⚽" }],
  collection: [{ text: "ASSIST!", rarity: "common", icon: "🅰️" }],
  elimination: [{ text: "STRAIGHT RED. 💀", rarity: "common", icon: "🟥" }],
  comeback: [{ text: "SCENES! ABSOLUTE SCENES!", rarity: "rare", icon: "🎉" }],
};

const movie_star: CharacterMemePool = {
  victory: [
    { text: "AND THAT'S A WRAP.", rarity: "common", icon: "🎬" },
    { text: "I'D LIKE TO THANK THE ACADEMY.", rarity: "uncommon", icon: "🏆" },
    { text: "ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
  ],
  defeat: [
    { text: "CUT! LET'S GO AGAIN.", rarity: "common", icon: "🎬" },
    { text: "THIS IS THE TRAGIC SECOND ACT.", rarity: "rare", icon: "🎭" },
  ],
  ability: [{ text: "DOING MY OWN STUNTS.", rarity: "common", icon: "🎬" }],
  collection: [{ text: "BOX OFFICE.", rarity: "common", icon: "🎟️" }],
  elimination: [{ text: "WRITTEN OUT OF THE SCRIPT. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "THE THIRD ACT TWIST.", rarity: "rare", icon: "🎭" }],
};

const gamer: CharacterMemePool = {
  victory: [
    { text: "GG EZ.", rarity: "common", icon: "🎮" },
    { text: "CLIPPED IT. POSTING IT.", rarity: "common", icon: "📹" },
    { text: "DIFF.", rarity: "uncommon", icon: "🎮" },
    { text: "NO HITS TAKEN. 100% RUN.", rarity: "rare", icon: "🏅", requires: ["flawless"] },
    { text: "WORLD RECORD PACE. ABSOLUTE CINEMA.", rarity: "legendary", icon: "🎬" },
  ],
  defeat: [
    { text: "SKILL ISSUE.", rarity: "common", icon: "🎮" },
    { text: "LAG. DEFINITELY LAG.", rarity: "common", icon: "📶" },
    { text: "I WAS HARD-STUCK ANYWAY.", rarity: "rare", icon: "😩" },
  ],
  ability: [{ text: "COOLDOWN? NEVER HEARD OF IT.", rarity: "common", icon: "⚡" }],
  collection: [{ text: "LOOT!", rarity: "common", icon: "🎁" }],
  elimination: [{ text: "GET GOOD. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "THE REVERSE SWEEP IS ON.", rarity: "rare", icon: "📈" }],
};

/* ══════════════════════════════════════════════════════════════════
   CHAOS
   ══════════════════════════════════════════════════════════════════ */

const mad_scientist: CharacterMemePool = {
  victory: [
    { text: "THE EXPERIMENT WORKED.", rarity: "common", icon: "🧪" },
    { text: "THIS WAS COMPLETELY INTENTIONAL.", rarity: "common", icon: "🔬" },
    { text: "PUBLISHING THIS IMMEDIATELY.", rarity: "uncommon", icon: "📄" },
    { text: "THEY CALLED ME MAD. WHO'S MAD NOW.", rarity: "legendary", icon: "⚗️" },
  ],
  defeat: [
    { text: "THE HYPOTHESIS WAS WRONG.", rarity: "common", icon: "📉" },
    { text: "PEER REVIEWED. PEER REJECTED.", rarity: "uncommon", icon: "📝" },
  ],
  ability: [
    { text: "MUTATION LEVEL: SPICY.", rarity: "common", icon: "🧬" },
    { text: "SIDE EFFECTS MAY INCLUDE VICTORY.", rarity: "rare", icon: "⚗️" },
  ],
  collection: [{ text: "GRANT FUNDING!", rarity: "common", icon: "💰" }],
  elimination: [{ text: "THE EXPERIMENT ESCAPED. 💀", rarity: "common", icon: "💀" }],
  comeback: [{ text: "UNEXPECTED RESULT. FASCINATING.", rarity: "rare", icon: "🔬" }],
};

const scientist: CharacterMemePool = {
  victory: [{ text: "THE EXPERIMENT WORKED.", rarity: "common", icon: "🧪" }],
  defeat: [{ text: "PEER REVIEWED. PEER REJECTED.", rarity: "common", icon: "📝" }],
  ability: [{ text: "MUTATING.", rarity: "common", icon: "🧬" }],
  collection: [{ text: "SAMPLE COLLECTED.", rarity: "common", icon: "🔬" }],
  elimination: [{ text: "EXPERIMENT TERMINATED.", rarity: "common", icon: "💀" }],
  comeback: [{ text: "STATISTICALLY IMPROBABLE.", rarity: "uncommon", icon: "📊" }],
};

const chaos: CharacterMemePool = {
  victory: [
    { text: "ABSOLUTE CINEMA.", rarity: "common", icon: "🎬" },
    { text: "I HAVE NO IDEA WHAT I'M DOING.", rarity: "common", icon: "🌀" },
    { text: "WE'RE SO BACK.", rarity: "uncommon", icon: "🌀" },
    { text: "I DON'T REMEMBER ANY OF THAT.", rarity: "legendary", icon: "🌀" },
  ],
  defeat: [
    { text: "WHAT ARE WE DOING 😭", rarity: "common", icon: "🌀" },
    { text: "IT'S OVER.", rarity: "common", icon: "🪦" },
  ],
  ability: [{ text: "CHAOS ENGAGED.", rarity: "common", icon: "🌀" }],
  collection: [{ text: "SHINY!", rarity: "common", icon: "✨" }],
  elimination: [{ text: "ANY% SPEEDRUN. 💀", rarity: "common", icon: "⚡" }],
  comeback: [{ text: "THE PLOT ARMOR IS INSANE.", rarity: "rare", icon: "🛡️" }],
};

/* ══════════════════════════════════════════════════════════════════ */

export const CHARACTER_MEMES: Record<string, CharacterMemePool> = {
  prime_swimmer, swimmer_in_chief, right_honourable, politician,
  mars_mogul, ai_overlord, tech_bro, space, ai,
  monad_maxi, bitcoin_maxi, defi_degen, chain_builder, crypto,
  pop_star, football_legend, movie_star, gamer,
  mad_scientist, scientist, chaos,
};

/** Situational lines that can fire for ANY character. */
export const CONTEXT_MEMES: Array<CharacterMeme & { event: MemeEvent }> = [
  { event: "victory", text: "HE HAD 1 HP AND STILL DID IT 💀", rarity: "rare", icon: "💀", requires: ["lowHealth"] },
  { event: "victory", text: "FLAWLESS. NOT A SCRATCH.", rarity: "rare", icon: "🛡️", requires: ["flawless"] },
  { event: "victory", text: "THE PLOT ARMOR IS INSANE.", rarity: "uncommon", icon: "🛡️", requires: ["comeback"] },
  { event: "victory", text: "MAIN CHARACTER ENERGY.", rarity: "uncommon", icon: "👑" },
  { event: "defeat", text: "99.9% COMPLETE 💀", rarity: "rare", icon: "💀", requires: ["nearEgg"] },
  { event: "defeat", text: "SO CLOSE. SO VERY CLOSE.", rarity: "uncommon", icon: "😩", requires: ["nearEgg"] },
  { event: "collection", text: "LIQUIDITY ACQUIRED.", rarity: "uncommon", icon: "💎", requires: ["bigMon"] },
];

/* ══════════════════════════════════════════════════════════════════
   SELECTION
   ══════════════════════════════════════════════════════════════════ */

export interface PickedMeme {
  text: string;
  rarity: Rarity;
  icon?: string;
}

/**
 * Weighted random pick, filtered by the active context flags.
 * Lines whose `requires` are not all satisfied are excluded, so a
 * "1 HP" joke can never fire on a comfortable win.
 */
export function pickCharacterMeme(
  personaId: string,
  event: MemeEvent,
  context: ContextFlag[] = []
): PickedMeme | null {
  const pool = CHARACTER_MEMES[personaId]?.[event] ?? [];
  const contextual = CONTEXT_MEMES.filter((m) => m.event === event);
  const all: CharacterMeme[] = [...pool, ...contextual];

  const eligible = all.filter(
    (m) => !m.requires || m.requires.every((r) => context.includes(r))
  );
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, m) => sum + RARITY_WEIGHT[m.rarity], 0);
  let roll = Math.random() * total;
  for (const m of eligible) {
    roll -= RARITY_WEIGHT[m.rarity];
    if (roll <= 0) return { text: m.text, rarity: m.rarity, icon: m.icon };
  }
  const last = eligible[eligible.length - 1];
  return { text: last.text, rarity: last.rarity, icon: last.icon };
}
