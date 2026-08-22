"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { drawSperm, type AccessoryKind } from "@/lib/sperm-art";
import { audio, sfx } from "@/lib/audio";
import MonadLogo from "@/components/monad-logo";

/* ── cinematic actors ───────────────────────────────────────────── */
interface Actor {
  x: number; y: number;        // world position
  vx: number; vy: number;
  targetY: number;
  r: number;
  color: string;
  accessory: AccessoryKind;
  seed: number;
  z: number;                   // depth 0.5..1.4 for parallax/scale
  hero: boolean;
}

const PALETTE: { c: string; a: AccessoryKind }[] = [
  { c: "#00d4ff", a: "helmet" },
  { c: "#ff1493", a: "jester" },
  { c: "#39ff14", a: "antenna" },
  { c: "#ffd700", a: "shades" },
  { c: "#bf5fff", a: "goggles" },
  { c: "#ff6b35", a: "tie" },
  { c: "#7ae0ff", a: "none" },
  { c: "#c77dff", a: "none" },
];

/* Timeline (seconds)
   0.0  darkness + dust
   1.2  first sperm swims in
   2.2  the swarm follows
   3.6  egg fades in from the distance
   5.2  swarm circles the egg
   6.6  hero breaks away toward camera
   7.4  TITLE hit + flash + shake
   8.4  subtitle
   9.0  buttons
*/
const T = { first: 1.2, swarm: 2.2, egg: 3.6, circle: 5.2, hero: 6.6, title: 7.4, sub: 8.4, cta: 9.0 };

export default function IntroPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const actorsRef = useRef<Actor[]>([]);
  const dustRef = useRef<{ x: number; y: number; z: number; s: number }[]>([]);
  const camRef = useRef({ x: 0, y: 0, zoom: 1, shake: 0, flash: 0 });
  const heroRef = useRef<Actor | null>(null);
  const firedRef = useRef<Record<string, boolean>>({});

  const [beat, setBeat] = useState(0);          // drives HTML overlay
  const [skipped, setSkipped] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const go = useCallback((href: string) => {
    sfx("click");
    setLeaving(true);
    setTimeout(() => router.push(href), 700);
  }, [router]);

  const skip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);
    startRef.current = performance.now() - T.cta * 1000 - 200;
    audio.init(); audio.setScene("menu");
  }, [skipped]);

  /* ── main cinematic loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    // seed dust
    dustRef.current = Array.from({ length: 160 }, () => ({
      x: Math.random() * 2400 - 400,
      y: Math.random() * 1200 - 300,
      z: 0.25 + Math.random() * 1.1,
      s: 0.6 + Math.random() * 2.4,
    }));

    // seed actors (off-screen left)
    actorsRef.current = PALETTE.map((p, i) => ({
      x: -420 - i * 130 - Math.random() * 160,
      y: 340 + Math.sin(i * 1.3) * 130,
      vx: 0, vy: 0,
      targetY: 300 + Math.sin(i * 2.1) * 150,
      r: 15 + (i % 3) * 4,
      color: p.c,
      accessory: p.a,
      seed: i * 1.37,
      z: 0.7 + (i % 4) * 0.16,
      hero: i === 0,
    }));
    heroRef.current = actorsRef.current[0];
    startRef.current = performance.now();

    const loop = (now: number) => {
      const t = (now - startRef.current) / 1000;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const cam = camRef.current;

      /* ── beat / sfx triggers ── */
      const fire = (k: string, at: number, fn: () => void) => {
        if (t >= at && !firedRef.current[k]) { firedRef.current[k] = true; fn(); }
      };
      fire("first", T.first, () => { audio.init(); audio.setScene("menu"); });
      fire("swarm", T.swarm, () => sfx("swim"));
      fire("egg", T.egg, () => sfx("mutate"));
      fire("hero", T.hero, () => sfx("boost"));
      fire("title", T.title, () => { sfx("monadBlast"); cam.shake = 26; cam.flash = 1; });

      const b = t < T.egg ? 0 : t < T.hero ? 1 : t < T.title ? 2 : t < T.sub ? 3 : t < T.cta ? 4 : 5;
      setBeat((prev) => (prev === b ? prev : b));

      /* ── camera ── */
      const eggWX = 1350, eggWY = 300;
      let camTargetX = -120, camTargetY = 0, zoomTarget = 1;
      if (t > T.first) { camTargetX = 0; }
      if (t > T.egg) { camTargetX = 260; zoomTarget = 0.94; }
      if (t > T.circle) { camTargetX = 460; zoomTarget = 0.88; }
      if (t > T.hero) { camTargetX = 520; zoomTarget = 1.05; }
      if (t > T.title) { camTargetX = 480; zoomTarget = 1.0; }
      cam.x += (camTargetX - cam.x) * 0.022;
      cam.y += (camTargetY - cam.y) * 0.02;
      cam.zoom += (zoomTarget - cam.zoom) * 0.03;
      cam.shake *= 0.9;
      cam.flash *= 0.94;

      /* ── actor AI ── */
      const actors = actorsRef.current;
      actors.forEach((a, i) => {
        const active = i === 0 ? t > T.first : t > T.swarm + i * 0.13;
        if (!active) return;

        if (t < T.circle) {
          // swim right toward the egg, gentle sine bob
          a.targetY = 300 + Math.sin(t * 1.1 + i * 1.7) * 120;
          a.vx += (( 210 + i * 12) - a.vx) * 0.02;
          a.vy += ((a.targetY - a.y) * 0.9 - a.vy) * 0.05;
        } else if (i !== 0 || t < T.hero) {
          // orbit the egg
          const ang = t * (0.9 + i * 0.07) + i * (Math.PI * 2 / actors.length);
          const rad = 190 + (i % 4) * 34;
          const tx = eggWX + Math.cos(ang) * rad * 1.35;
          const ty = eggWY + Math.sin(ang) * rad;
          a.vx += ((tx - a.x) * 2.6 - a.vx) * 0.06;
          a.vy += ((ty - a.y) * 2.6 - a.vy) * 0.06;
        } else {
          // HERO breaks away and rushes the camera
          const k = Math.min(1, (t - T.hero) / 1.5);
          a.vx += ((-620 - a.vx)) * 0.05;
          a.vy += (((H * 0.52) - a.y) * 1.5 - a.vy) * 0.05;
          a.z += (2.9 - a.z) * 0.035 * (0.5 + k);
          a.r += (46 - a.r) * 0.03;
        }

        a.x += a.vx * (1 / 60);
        a.y += a.vy * (1 / 60);
      });

      /* ── RENDER ── */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // deep space-biology backdrop
      const bg = ctx.createRadialGradient(W * 0.62, H * 0.45, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      const warm = Math.min(1, Math.max(0, (t - T.egg) / 3));
      bg.addColorStop(0, `rgb(${18 + warm * 34},${2 + warm * 6},${34 + warm * 26})`);
      bg.addColorStop(0.45, "#0d0018");
      bg.addColorStop(1, "#030007");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2 + (Math.random() - 0.5) * cam.shake, H / 2 + (Math.random() - 0.5) * cam.shake);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-W / 2 - cam.x, -H / 2 - cam.y);

      /* dust / micro-particles */
      for (const d of dustRef.current) {
        const px = d.x - cam.x * d.z * 0.6;
        const py = d.y + H * 0.1;
        const alpha = 0.10 + Math.sin(t * 1.6 + d.x * 0.01) * 0.07 + d.z * 0.08;
        ctx.beginPath();
        ctx.arc(px, py, d.s * d.z, 0, 6.3);
        ctx.fillStyle = `rgba(190,160,255,${Math.max(0, alpha)})`;
        ctx.fill();
      }

      /* floating DNA structures */
      for (let s = 0; s < 4; s++) {
        const bx = 200 + s * 520 - cam.x * (0.25 + s * 0.05);
        ctx.save();
        ctx.globalAlpha = 0.14;
        for (let k = 0; k < 30; k++) {
          const yy = -160 + (k / 30) * (H + 320);
          const w = Math.sin(k * 0.5 + t * 1.1 + s) * 30;
          ctx.beginPath(); ctx.arc(bx + w, yy, 3.2, 0, 6.3);
          ctx.fillStyle = k % 2 ? "#8b5cf6" : "#ff4fa3"; ctx.fill();
          ctx.beginPath(); ctx.arc(bx - w, yy, 3.2, 0, 6.3);
          ctx.fillStyle = k % 2 ? "#ff4fa3" : "#8b5cf6"; ctx.fill();
          if (k % 4 === 0) {
            ctx.beginPath(); ctx.moveTo(bx + w, yy); ctx.lineTo(bx - w, yy);
            ctx.strokeStyle = "rgba(200,170,255,.4)"; ctx.lineWidth = 1.2; ctx.stroke();
          }
        }
        ctx.restore();
      }

      /* THE EGG */
      if (t > T.egg - 0.6) {
        const k = Math.min(1, (t - (T.egg - 0.6)) / 2.2);
        const R = 150 * k;
        const ex = eggWX, ey = eggWY + H * 0.1;
        const glow = ctx.createRadialGradient(ex, ey, 8, ex, ey, R * 3.4);
        glow.addColorStop(0, `rgba(255,220,245,${0.5 * k})`);
        glow.addColorStop(0.32, `rgba(255,120,210,${0.2 * k})`);
        glow.addColorStop(1, "rgba(139,92,246,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(ex, ey, R * 3.4, 0, 6.3); ctx.fill();

        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(1, 1.16 + Math.sin(t * 1.6) * 0.03);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3);
        const eg = ctx.createRadialGradient(-R * 0.32, -R * 0.36, R * 0.05, 0, 0, R);
        eg.addColorStop(0, "#ffffff"); eg.addColorStop(0.28, "#ffdcef");
        eg.addColorStop(0.62, "#ff8fd0"); eg.addColorStop(1, "#7c3aed");
        ctx.fillStyle = eg; ctx.fill();
        ctx.restore();

        // Actual Monad Logo
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(t * 0.25);
        ctx.globalAlpha = 0.8 * k;
        const logoR = R * 0.45;
        
        // Purple circle background
        ctx.beginPath();
        ctx.arc(0, 0, logoR, 0, Math.PI * 2);
        ctx.fillStyle = "#836EF9";
        ctx.fill();
        
        // White rounded rectangle (rotated 45 degrees)
        ctx.rotate(Math.PI / 4);
        const rectSize = logoR * 0.86;
        const rx = logoR * 0.23;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, rx);
        } else {
          ctx.rect(-rectSize / 2, -rectSize / 2, rectSize, rectSize);
        }
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = logoR * 0.3;
        ctx.stroke();
        
        ctx.restore();

        // orbiting motes
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + t * 0.5;
          const rr = R * 1.5 + Math.sin(t * 2 + i) * 22;
          ctx.beginPath();
          ctx.arc(ex + Math.cos(a) * rr * 1.25, ey + Math.sin(a) * rr, 3.4, 0, 6.3);
          ctx.fillStyle = `rgba(255,190,240,${(0.25 + Math.sin(t * 3 + i) * 0.25) * k})`;
          ctx.fill();
        }
      }

      /* ACTORS — sorted by depth so the hero passes in front */
      const sorted = [...actors].sort((a, b) => a.z - b.z);
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const idx = actors.indexOf(a);
        const active = idx === 0 ? t > T.first : t > T.swarm + idx * 0.13;
        if (!active) continue;

        const ang = Math.atan2(a.vy, a.vx);
        const spd = Math.min(1, Math.hypot(a.vx, a.vy) / 420);

        // motion trail
        for (let k = 1; k <= 5; k++) {
          ctx.beginPath();
          ctx.arc(a.x - a.vx * 0.012 * k, a.y - a.vy * 0.012 * k, a.r * a.z * (0.5 - k * 0.07), 0, 6.3);
          ctx.fillStyle = a.color;
          ctx.globalAlpha = 0.1 - k * 0.015;
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        drawSperm(ctx, {
          x: a.x, y: a.y,
          r: a.r * a.z,
          angle: ang,
          time: now,
          color: a.color,
          accessory: a.accessory,
          expression: a.hero && t > T.hero ? "determined" : spd > 0.5 ? "happy" : "idle",
          effort: 0.4 + spd * 0.6,
          boosting: a.hero && t > T.hero,
          seed: a.seed,
        });
      }

      ctx.restore();

      /* white flash on title hit */
      if (cam.flash > 0.01) {
        ctx.fillStyle = `rgba(226,210,255,${cam.flash * 0.85})`;
        ctx.fillRect(0, 0, W, H);
      }

      /* cinematic letterbox bars until the CTA beat */
      const barK = t < T.title ? 1 : Math.max(0, 1 - (t - T.title) / 1.2);
      if (barK > 0.01) {
        const bh = H * 0.09 * barK;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, bh);
        ctx.fillRect(0, H - bh, W, bh);
      }

      /* vignette */
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const showTitle = beat >= 3;
  const showSub = beat >= 4;
  const showCta = beat >= 5;

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black transition-all duration-700 ${
      leaving ? "opacity-0 scale-105 blur-md" : "opacity-100"
    }`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* film grain overlay for a cinematic texture */}
      <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
          animation: "float 6s ease-in-out infinite",
        }} />

      {/* top-left brand */}
      <div className="absolute top-5 left-5 z-20 flex items-center gap-2 opacity-70">
        <MonadLogo size={18} spin />
        <span className="text-[9px] tracking-[0.3em] text-purple-300/60 font-mono">MONAD TESTNET</span>
      </div>

      {/* skip */}
      {!showCta && (
        <button onClick={skip}
          className="absolute top-5 right-5 z-20 text-[10px] tracking-[0.25em] px-3 py-1.5 rounded-lg border border-purple-500/25 text-purple-300/70 hover:text-white hover:border-purple-400/60 hover:bg-purple-500/10 transition">
          SKIP INTRO ›
        </button>
      )}

      {/* TITLE */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none px-4">
        <div className="transition-all duration-700 ease-out text-center"
          style={{
            opacity: showTitle ? 1 : 0,
            transform: showTitle ? "scale(1)" : "scale(1.35)",
            filter: showTitle ? "blur(0)" : "blur(14px)",
          }}>
          <h1 className="font-black tracking-tighter leading-[0.86] select-none"
            style={{ fontSize: "clamp(3.2rem, 12vw, 9rem)" }}>
            <span className="block title-glow" style={{ color: "#e2d4ff" }}>SPERM</span>
            <span className="block" style={{
              color: "#ff2d92",
              textShadow: "0 0 44px rgba(255,45,146,.85), 0 0 90px rgba(255,45,146,.4)",
            }}>WARS</span>
          </h1>
        </div>

        <div className="mt-5 transition-all duration-700"
          style={{ opacity: showSub ? 1 : 0, transform: showSub ? "translateY(0)" : "translateY(22px)" }}>
          <div className="flex items-center gap-3 justify-center">
            <span className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-purple-400/60" />
            <MonadLogo size={15} />
            <span className="text-xs md:text-base font-black tracking-[0.42em] text-purple-200">MONAD EDITION</span>
            <MonadLogo size={15} />
            <span className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-purple-400/60" />
          </div>
          <p className="text-center text-purple-200/55 italic mt-4 text-sm md:text-lg tracking-wide">
            8 Sperm. 1 Egg. Infinite Chaos.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-10 md:pb-14 px-4">
        <div className="transition-all duration-700 w-full flex flex-col items-center"
          style={{
            opacity: showCta ? 1 : 0,
            transform: showCta ? "translateY(0)" : "translateY(38px)",
            pointerEvents: showCta ? "auto" : "none",
          }}>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto max-w-md">
            <button onClick={() => go("/play")} onMouseEnter={() => sfx("hover")}
              className="group relative px-9 py-4 rounded-2xl font-black text-base tracking-[0.14em] uppercase overflow-hidden transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#ff2d92,#c026d3 55%,#8b5cf6)",
                color: "#fff",
                boxShadow: "0 0 42px rgba(255,45,146,.5), 0 8px 26px rgba(0,0,0,.55)",
              }}>
              <span className="absolute inset-0 opacity-70" style={{
                background: "linear-gradient(105deg,transparent 38%,rgba(255,255,255,.22) 50%,transparent 62%)",
                backgroundSize: "220% 100%", animation: "shimmer 2.6s linear infinite",
              }} />
              <span className="relative">▶ PLAY NOW</span>
            </button>

            <button onClick={() => go("/game")} onMouseEnter={() => sfx("hover")}
              className="px-9 py-4 rounded-2xl font-black text-base tracking-[0.14em] uppercase transition-all hover:scale-105 active:scale-95"
              style={{
                background: "rgba(139,92,246,.12)",
                color: "#e2d4ff",
                border: "1px solid rgba(167,139,250,.5)",
                boxShadow: "0 0 26px rgba(139,92,246,.28)",
              }}>
              🧬 ENTER THE ARENA
            </button>
          </div>

          <div className="flex items-center gap-5 mt-6 text-[10px] tracking-[0.22em] text-purple-400/45 font-mono">
            <span>2 GAME MODES</span><span className="text-purple-600">·</span>
            <span>8 PLAYERS</span><span className="text-purple-600">·</span>
            <span>BUILT ON MONAD</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-5 z-20 text-[8px] text-purple-700/40 font-mono tracking-wider">
        v2.0 // PARALLEL EXECUTION
      </div>
    </div>
  );
}
