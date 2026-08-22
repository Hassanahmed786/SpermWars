"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SpermPreview from "@/components/sperm-preview";
import MonadCore from "@/components/monad-core";
import MonadHeader from "@/components/monad-header";
import WalletButton from "@/components/wallet-button";
import MultiplayerHeroButton from "@/components/multiplayer-hero-button";
import { useMemes } from "@/lib/meme-engine";
import { audio, sfx } from "@/lib/audio";

/* ── mini animated previews drawn on canvas inside each card ────── */
function ArenaPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = 460, H = 190;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const swimmers = Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * Math.PI * 2, r: 42 + (i % 3) * 16, sp: 0.0007 + i * 0.00015,
      col: ["#00d4ff", "#ff6b35", "#39ff14", "#ffd700", "#bf5fff", "#ff1493"][i],
    }));
    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, 5, W / 2, H / 2, W * 0.5);
      g.addColorStop(0, "rgba(255,140,220,.16)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // egg
      ctx.beginPath(); ctx.ellipse(W / 2, H / 2, 26, 31, 0, 0, 6.3);
      const eg = ctx.createRadialGradient(W / 2 - 8, H / 2 - 9, 2, W / 2, H / 2, 30);
      eg.addColorStop(0, "#fff"); eg.addColorStop(.5, "#ffb6d9"); eg.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = eg; ctx.fill();
      // swimmers as simple glowing heads + tails
      for (const s of swimmers) {
        const a = s.a + t * s.sp;
        const x = W / 2 + Math.cos(a) * s.r * 1.9;
        const y = H / 2 + Math.sin(a) * s.r;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.3);
        ctx.fillStyle = s.col + "22"; ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y, 6, 5, a + 1.57, 0, 6.3);
        ctx.fillStyle = s.col; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 1; k <= 5; k++) {
          const ta = a + 1.57 + Math.PI;
          ctx.lineTo(x + Math.cos(ta) * k * 5 + Math.sin(t * .01 + k) * 3,
                     y + Math.sin(ta) * k * 5 + Math.cos(t * .01 + k) * 3);
        }
        ctx.strokeStyle = s.col; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: 190, display: "block" }} />;
}

function DashPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = 460, H = 190;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(60,10,100,.4)"); bg.addColorStop(1, "rgba(20,2,40,.4)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // canal
      ctx.fillStyle = "rgba(90,30,140,.55)";
      ctx.fillRect(0, 0, W, 26); ctx.fillRect(0, H - 26, W, 26);
      // scrolling obstacles
      const sc = (t * 0.16) % 150;
      for (let i = -1; i < 5; i++) {
        const x = W - (i * 150 - sc);
        ctx.beginPath(); ctx.arc(x, 60 + (i % 2) * 70, 17, 0, 6.3);
        ctx.fillStyle = "#c40f38"; ctx.fill();
        ctx.strokeStyle = "#ff2d55"; ctx.lineWidth = 2; ctx.stroke();
      }
      // MON
      for (let i = 0; i < 7; i++) {
        const x = ((i * 78 - t * 0.16) % (W + 80) + W + 80) % (W + 80) - 40;
        const y = H / 2 + Math.sin(i * 1.1 + t * 0.002) * 34;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.003);
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
        ctx.closePath(); ctx.fillStyle = "#ffd700"; ctx.fill(); ctx.restore();
      }
      // player
      const py = H / 2 + Math.sin(t * 0.004) * 30;
      ctx.beginPath(); ctx.ellipse(90, py, 11, 9, Math.sin(t * .004) * .3, 0, 6.3);
      const pg = ctx.createRadialGradient(86, py - 4, 1, 90, py, 12);
      pg.addColorStop(0, "#fff"); pg.addColorStop(1, "#00d4ff");
      ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.moveTo(80, py);
      for (let k = 1; k <= 7; k++) ctx.lineTo(80 - k * 7, py + Math.sin(t * .02 + k) * k * 1.5);
      ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke();
      // speed lines
      ctx.strokeStyle = "rgba(196,181,253,.25)"; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const y = 30 + ((i * 47 + t * 0.05) % (H - 60));
        const x = ((i * 133 - t * 0.5) % (W + 120));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 46, y); ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: 190, display: "block" }} />;
}

/* ── tilt card ──────────────────────────────────────────────────── */
function GameCard({
  title, tag, desc, accent, bullets, href, preview, badge,
}: {
  title: string; tag: string; desc: string; accent: string;
  bullets: string[]; href: string; preview: React.ReactNode; badge: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  const move = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 11, y: px * 13 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseEnter={() => { setHover(true); sfx("hover"); }}
      onMouseLeave={() => { setHover(false); setTilt({ x: 0, y: 0 }); }}
      onClick={() => { sfx("click"); router.push(href); }}
      className="relative cursor-pointer rounded-3xl overflow-hidden transition-shadow duration-300"
      style={{
        transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hover ? 1.025 : 1})`,
        transformStyle: "preserve-3d",
        transition: "transform .18s cubic-bezier(.2,.8,.3,1)",
        background: "linear-gradient(150deg, rgba(139,92,246,.14), rgba(10,0,22,.75))",
        border: `1px solid ${hover ? accent : "rgba(139,92,246,.26)"}`,
        boxShadow: hover
          ? `0 24px 70px -18px ${accent}88, 0 0 46px -12px ${accent}55`
          : "0 14px 44px -22px rgba(0,0,0,.85)",
      }}
    >
      {/* animated sheen */}
      <div className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(600px circle at ${50 + tilt.y * 3}% ${50 - tilt.x * 3}%, ${accent}1f, transparent 55%)`,
        }} />

      <div className="absolute top-4 left-4 z-10 text-[9px] font-black tracking-[0.25em] px-2.5 py-1 rounded-full"
        style={{ background: accent + "22", border: `1px solid ${accent}55`, color: accent }}>
        {badge}
      </div>

      <div className="relative" style={{ transform: "translateZ(30px)" }}>
        {preview}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: "linear-gradient(to top, rgba(10,0,22,.95), transparent)" }} />
      </div>

      <div className="p-6 relative" style={{ transform: "translateZ(45px)" }}>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: accent }}>
          {title}
        </h2>
        <p className="text-[11px] tracking-[0.28em] text-purple-300/60 mt-0.5 mb-3">{tag}</p>
        <p className="text-sm text-purple-100/70 leading-relaxed mb-4">{desc}</p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {bullets.map((b) => (
            <span key={b}
              className="text-[10px] px-2 py-1 rounded-lg text-purple-200/80"
              style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.22)" }}>
              {b}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[0.25em] text-purple-400/50">
            {hover ? "CLICK TO ENTER" : "SELECT MODE"}
          </span>
          <span
            className="px-6 py-2.5 rounded-xl font-black text-sm tracking-wider transition-all"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
              color: "#12061c",
              boxShadow: hover ? `0 0 26px ${accent}99` : "none",
              transform: hover ? "scale(1.05)" : "scale(1)",
            }}>
            PLAY ▶
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────── */
function PlayContent() {
  const memes = useMemes();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    audio.init(); audio.setScene("menu");
    const i = setInterval(() => setTick((t) => t + 1), 60);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden page-fade">
      {/* drifting sperm in the background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        {["space", "chaos", "crypto"].map((id, i) => (
          <div key={id} className="absolute"
            style={{
              left: `${((i * 33 + tick * 0.22) % 118) - 9}%`,
              top: `${18 + Math.sin(tick * 0.02 + i * 2) * 26 + i * 22}%`,
              transform: `scale(${0.5 + i * 0.16})`,
            }}>
            <SpermPreview characterId={id} size={110} />
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-8 space-y-6">
        <MonadHeader active="play" />

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black neon-text tracking-tight">CHOOSE YOUR BATTLE</h1>
          <p className="text-xs tracking-[0.45em] text-purple-400/70 mt-1">TWO GAMES · ONE MONAD CORE</p>
        </div>

        {/* Hero — the MONAD CORE with orbiting cartoon sperm as the signature visual */}
        <div className="flex flex-col items-center gap-1">
          <MonadCore
            size={360}
            intensity={1.2}
            interactive
            onSurge={() => memes.push("any", "use_blast")}
          />
          <p className="text-[10px] tracking-widest text-purple-400/50">CLICK THE CORE FOR A MONAD SURGE</p>
        </div>

        <MultiplayerHeroButton />

        <div className="grid md:grid-cols-2 gap-6">
          <GameCard
            title="🧬 CHAOS ARENA"
            tag="SURVIVE · MUTATE · SABOTAGE"
            desc="Up to 8 sperm brawl inside a microscopic warzone. Dash, knock rivals into hazards, collect MON, trigger mutations and unleash the MONAD BLAST. Last swimmer standing fertilises the egg."
            accent="#a855f7"
            badge="MULTIPLAYER · 8P"
            bullets={["Real-time PvP", "AI opponents", "Random events", "Parallel events", "Monad Blast"]}
            href="/game"
            preview={<ArenaPreview />}
          />
          <GameCard
            title="🥚 SPERM DASH"
            tag="SWIM · DODGE · SURVIVE"
            desc="An endless swim through the canal. Dodge immune cells, DNA barriers and electric fences, chain MON combos, grab power-ups and survive boss chases on the 3000m race to the egg."
            accent="#ff4fa3"
            badge="SOLO · ENDLESS"
            bullets={["Endless runner", "5 power-ups", "Boss events", "Combo system", "Procedural levels"]}
            href="/dash"
            preview={<DashPreview />}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { h: "/characters", i: "🧬", t: "CHARACTERS" },
            { h: "/leaderboard", i: "🏆", t: "LEADERBOARD" },
            { h: "/profile", i: "👤", t: "PROFILE" },
            { h: "/how-to-play", i: "📖", t: "HOW TO PLAY" },
          ].map((l) => (
            <Link key={l.h} href={l.h} onMouseEnter={() => sfx("hover")}
              className="glass-card p-4 text-center hover:-translate-y-1 transition-transform group">
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{l.i}</div>
              <p className="text-[10px] tracking-[0.2em] text-purple-300/80 font-bold">{l.t}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <PlayContent />
  );
}
