"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import MonadHeader from "@/components/monad-header";
import { sfx } from "@/lib/audio";
import { loadProfile } from "@/lib/profile";

type Mode = "dash" | "arena";

interface DashRow { id: string; username: string | null; wallet: string | null; score: number; distance: number; mon: number; combo: number; characterId: string | null; }
interface ArenaRow { username: string | null; wallet: string | null; games: number; wins: number; kills: number; mon: number; }

const short = (w: string | null) => (w ? `${w.slice(0, 5)}...${w.slice(-3)}` : "—");

function LeaderboardInner() {
  const [mode, setMode] = useState<Mode>("dash");
  const [rows, setRows] = useState<(DashRow | ArenaRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [you, setYou] = useState<{ dash: number; wins: number } | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setYou({ dash: p.stats.dashBestScore, wins: p.stats.arenaWins });
  }, []);

  const load = useCallback(async (m: Mode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scores?mode=${m}`);
      const j = await res.json();
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(mode); }, [mode, load]);

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div className="min-h-screen animated-bg p-5 page-fade">
      <div className="max-w-4xl mx-auto space-y-5">
        <MonadHeader active="leaderboard" />
        <div>
          <h1 className="text-3xl font-black neon-text">LEADERBOARD</h1>
          <p className="text-xs text-purple-400/70 tracking-widest">GLOBAL RANKINGS</p>
        </div>

        {/* mode tabs */}
        <div className="flex gap-2">
          {([
            { m: "dash" as Mode, l: "🥚 SPERM DASH", c: "#ff4fa3" },
            { m: "arena" as Mode, l: "🧬 CHAOS ARENA", c: "#a855f7" },
          ]).map((t) => (
            <button key={t.m}
              onClick={() => { sfx("click"); setMode(t.m); }}
              onMouseEnter={() => sfx("hover")}
              className="flex-1 py-3 rounded-xl text-sm font-black tracking-wider transition-all"
              style={{
                background: mode === t.m ? `${t.c}22` : "rgba(139,92,246,.06)",
                border: `1px solid ${mode === t.m ? t.c : "rgba(139,92,246,.18)"}`,
                color: mode === t.m ? t.c : "#8b7fa8",
                boxShadow: mode === t.m ? `0 0 22px ${t.c}44` : "none",
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* your best */}
        {you && (
          <div className="glass-card p-3 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.25em] text-purple-400/60">YOUR BEST</span>
            <span className="text-sm font-black" style={{ color: mode === "dash" ? "#ff4fa3" : "#a855f7" }}>
              {mode === "dash" ? `${you.dash.toLocaleString()} pts` : `${you.wins} wins`}
            </span>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="p-3 border-b border-purple-900/30 flex items-center justify-between">
            <h3 className="text-xs font-black text-purple-300 tracking-widest">
              {mode === "dash" ? "TOP SWIMMERS" : "TOP FIGHTERS"}
            </h3>
            <span className="text-[9px] text-purple-500/50">OFF-CHAIN GAME STATS</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-purple-400/60 text-sm animate-pulse">Loading rankings…</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-sm text-purple-300 font-bold mb-1">No scores yet</p>
              <p className="text-xs text-purple-400/60 mb-4">Be the first swimmer on the board.</p>
              <Link href={mode === "dash" ? "/dash" : "/game"} className="glow-btn glow-btn-pink px-6 py-2.5 text-xs inline-block">
                PLAY NOW
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[9px] tracking-widest text-purple-400/55 border-b border-purple-900/20">
                  <th className="p-2.5 text-left w-12">#</th>
                  <th className="p-2.5 text-left">PLAYER</th>
                  {mode === "dash" ? (
                    <>
                      <th className="p-2.5 text-right">SCORE</th>
                      <th className="p-2.5 text-right">DIST</th>
                      <th className="p-2.5 text-right">MON</th>
                      <th className="p-2.5 text-right">COMBO</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2.5 text-right">WINS</th>
                      <th className="p-2.5 text-right">GAMES</th>
                      <th className="p-2.5 text-right">KILLS</th>
                      <th className="p-2.5 text-right">MON</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="text-xs border-b border-purple-900/10 hover:bg-purple-500/5 transition">
                    <td className="p-2.5 font-black text-purple-400">{medal(i)}</td>
                    <td className="p-2.5">
                      <p className="font-bold text-purple-100">{r.username || "Anonymous Swimmer"}</p>
                      {r.wallet && <p className="text-[9px] font-mono text-purple-500/60">{short(r.wallet)}</p>}
                    </td>
                    {mode === "dash" ? (
                      <>
                        <td className="p-2.5 text-right font-black text-white">{(r as DashRow).score?.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-purple-300">{(r as DashRow).distance}m</td>
                        <td className="p-2.5 text-right text-yellow-400">{(r as DashRow).mon}</td>
                        <td className="p-2.5 text-right text-pink-400">x{(r as DashRow).combo}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-2.5 text-right font-black text-yellow-400">{(r as ArenaRow).wins}</td>
                        <td className="p-2.5 text-right text-purple-300">{(r as ArenaRow).games}</td>
                        <td className="p-2.5 text-right text-red-300">{(r as ArenaRow).kills}</td>
                        <td className="p-2.5 text-right text-yellow-400">{(r as ArenaRow).mon}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-[10px] text-purple-500/40 text-center">
          Rankings are gameplay statistics stored on the game server (off-chain).
          On-chain results are recorded separately via the Monad contract when enabled.
        </p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <LeaderboardInner />;
}
