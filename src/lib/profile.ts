/**
 * Local player profile + achievements.
 * Stored in localStorage (client-authoritative for *display only*).
 * Real competitive data lives server-side / on-chain — this is the
 * personal progress tracker so the game feels persistent offline.
 */

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  goal: number;
  /** which stat drives it */
  stat: keyof PlayerProfile["stats"];
}

export interface PlayerProfile {
  character: string;
  stats: {
    gamesPlayed: number;
    arenaGames: number;
    arenaWins: number;
    arenaKills: number;
    dashRuns: number;
    dashBestScore: number;
    dashBestDistance: number;
    dashBestCombo: number;
    monEarned: number;
    bestStreak: number;
    currentStreak: number;
    eggsReached: number;
    topSpeed: number;
  };
  unlocked: string[];
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_swim",   name: "First Swim",     desc: "Complete your first game",              icon: "🏊", goal: 1,    stat: "gamesPlayed" },
  { id: "champion",     name: "Monad Champion", desc: "Win a Chaos Arena match",               icon: "🏆", goal: 1,    stat: "arenaWins" },
  { id: "survivor",     name: "Survivor",       desc: "Play 5 arena matches",                  icon: "🛡️", goal: 5,    stat: "arenaGames" },
  { id: "chaos_lord",   name: "Chaos Lord",     desc: "Eliminate 10 opponents",                icon: "💀", goal: 10,   stat: "arenaKills" },
  { id: "speed_demon",  name: "Speed Demon",    desc: "Reach x2.5 speed in Sperm Dash",        icon: "⚡", goal: 25,   stat: "topSpeed" },
  { id: "mon_collector",name: "MON Collector",  desc: "Collect 100 MON energy",                icon: "💎", goal: 100,  stat: "monEarned" },
  { id: "egg_seeker",   name: "Egg Seeker",     desc: "Reach the egg in Sperm Dash",           icon: "🥚", goal: 1,    stat: "eggsReached" },
  { id: "marathon",     name: "Marathon Swimmer", desc: "Swim 1500m in a single run",          icon: "🌊", goal: 1500, stat: "dashBestDistance" },
  { id: "combo_king",   name: "Combo King",     desc: "Hit a x25 MON combo",                   icon: "🔥", goal: 25,   stat: "dashBestCombo" },
  { id: "high_scorer",  name: "High Scorer",    desc: "Score 25,000 in Sperm Dash",            icon: "⭐", goal: 25000,stat: "dashBestScore" },
  { id: "veteran",      name: "Veteran",        desc: "Play 20 games total",                   icon: "🎖️", goal: 20,   stat: "gamesPlayed" },
  { id: "unstoppable",  name: "Unstoppable",    desc: "Win 3 arena matches in a row",          icon: "🌀", goal: 3,    stat: "bestStreak" },
];

const KEY = "spermwars.profile.v1";

function blank(): PlayerProfile {
  return {
    character: "space",
    stats: {
      gamesPlayed: 0, arenaGames: 0, arenaWins: 0, arenaKills: 0,
      dashRuns: 0, dashBestScore: 0, dashBestDistance: 0, dashBestCombo: 0,
      monEarned: 0, bestStreak: 0, currentStreak: 0, eggsReached: 0, topSpeed: 0,
    },
    unlocked: [],
  };
}

export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const p = JSON.parse(raw) as PlayerProfile;
    return { ...blank(), ...p, stats: { ...blank().stats, ...p.stats } };
  } catch {
    return blank();
  }
}

export function saveProfile(p: PlayerProfile): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Re-evaluates achievements, returns newly unlocked ones. */
export function evaluateAchievements(p: PlayerProfile): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (p.unlocked.includes(a.id)) continue;
    if ((p.stats[a.stat] ?? 0) >= a.goal) {
      p.unlocked.push(a.id);
      fresh.push(a);
    }
  }
  return fresh;
}

export function achievementProgress(p: PlayerProfile, a: Achievement): number {
  return Math.min(1, (p.stats[a.stat] ?? 0) / a.goal);
}

/* ── recorders ─────────────────────────────────────────────────── */

export function recordDashRun(r: {
  score: number; distance: number; mon: number; won: boolean; bestCombo: number;
}): Achievement[] {
  const p = loadProfile();
  p.stats.gamesPlayed++;
  p.stats.dashRuns++;
  p.stats.dashBestScore = Math.max(p.stats.dashBestScore, r.score);
  p.stats.dashBestDistance = Math.max(p.stats.dashBestDistance, r.distance);
  p.stats.dashBestCombo = Math.max(p.stats.dashBestCombo, r.bestCombo);
  p.stats.monEarned += r.mon;
  if (r.won) p.stats.eggsReached++;
  // speed proxy: distance/run tells us how fast they got
  p.stats.topSpeed = Math.max(p.stats.topSpeed, Math.floor(r.distance / 60));
  const fresh = evaluateAchievements(p);
  saveProfile(p);
  return fresh;
}

export function recordArenaMatch(r: {
  won: boolean; kills: number; mon: number;
}): Achievement[] {
  const p = loadProfile();
  p.stats.gamesPlayed++;
  p.stats.arenaGames++;
  p.stats.arenaKills += r.kills;
  p.stats.monEarned += r.mon;
  if (r.won) {
    p.stats.arenaWins++;
    p.stats.currentStreak++;
    p.stats.bestStreak = Math.max(p.stats.bestStreak, p.stats.currentStreak);
  } else {
    p.stats.currentStreak = 0;
  }
  const fresh = evaluateAchievements(p);
  saveProfile(p);
  return fresh;
}

export function setProfileCharacter(id: string): void {
  const p = loadProfile();
  p.character = id;
  saveProfile(p);
}
