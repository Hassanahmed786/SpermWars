"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { drawSpermByCharacter } from "@/lib/sperm-art";
import MonadLogo from "./monad-logo";
import { audio, sfx } from "@/lib/audio";

/**
 * MONAD CORE — the signature visual of Sperm Wars.
 *
 * The official Monad logo is the centerpiece, NOT an egg. Around it,
 * 12 cartoon sperm (drawn with the real sperm-art renderer) orbit in
 * 3 layers. The core reacts to the mouse: glow pulses, particles
 * drift toward the cursor, and a click triggers a cinematic "MONAD SURGE"
 * shockwave. The whole composition is the "egg" replacement.
 *
 * Used in: landing page (intro), dashboard hero, game selection, and
 * the multiplayer portal.
 */
export interface MonadCoreProps {
  size?: number;
  intensity?: number;     // multiplies ring/glow size
  interactive?: boolean;  // enable mouse follow + click surge
  onSurge?: () => void;   // fires when user clicks the core
  className?: string;
}

interface OrbitSperm {
  id: number;
  characterId: string;
  layer: 0 | 1 | 2;        // 0=inner, 1=mid, 2=outer
  /** radians at t=0 */
  baseAngle: number;
  /** radians per second */
  speed: number;
  /** fraction of full radius */
  radiusFactor: number;
  /** depth — >0 is in front, <0 is behind. drives scale + z-translate */
  depth: number;
  size: number;            // base head radius before depth scaling
  color: string;
  seed: number;
  /** 0..1 — chance per second of a small wobble / speed spike */
  wobble: number;
}

const ORBIT_COLORS = ["#00d4ff", "#ff1493", "#ffd700", "#39ff14", "#bf5fff", "#ff6b35"];

const SPERM_POOL: Array<{ id: string; color: string }> = [
  { id: "space", color: "#00d4ff" },
  { id: "politician", color: "#ff6b35" },
  { id: "ai", color: "#39ff14" },
  { id: "crypto", color: "#ffd700" },
  { id: "scientist", color: "#bf5fff" },
  { id: "chaos", color: "#ff1493" },
];

/** Build a stable 12-sperm orbit with 3 inner / 4 mid / 5 outer. */
function buildOrbit(): OrbitSperm[] {
  const out: OrbitSperm[] = [];
  const layers: Array<{ count: number; radius: number; size: number; speed: [number, number] }> = [
    { count: 3, radius: 0.46, size: 13, speed: [0.42, 0.6] },   // inner
    { count: 4, radius: 0.68, size: 11, speed: [-0.28, -0.4] }, // mid (reverse)
    { count: 5, radius: 0.92, size: 9,  speed: [0.18, 0.26] },  // outer
  ];
  let id = 0;
  layers.forEach((l, layerIdx) => {
    for (let i = 0; i < l.count; i++) {
      const angle = (i / l.count) * Math.PI * 2 + (layerIdx === 1 ? 0.4 : 0);
      const speed = l.speed[0] + (i / l.count) * (l.speed[1] - l.speed[0]) + Math.random() * 0.08;
      const depth = (Math.random() * 0.45 + 0.1) * (i % 2 === 0 ? 1 : -1) * 0.9;
      const pool = SPERM_POOL[(id + layerIdx) % SPERM_POOL.length];
      out.push({
        id: id++,
        characterId: pool.id,
        layer: layerIdx as 0 | 1 | 2,
        baseAngle: angle,
        speed,
        radiusFactor: l.radius + Math.random() * 0.04,
        depth,
        size: l.size,
        color: pool.color,
        seed: (i + 1) * 1.37 + layerIdx,
        wobble: 0.4 + Math.random() * 0.4,
      });
    }
  });
  return out;
}

export default function MonadCore({
  size = 320,
  intensity = 1,
  interactive = true,
  onSurge,
  className,
}: MonadCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spermRef = useRef<OrbitSperm[]>(buildOrbit());
  const [surge, setSurge] = useState(0);            // incremented each click
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const surgeTimeRef = useRef(0);
  const R = size / 2;
  const CORE_R = size * 0.18 * intensity;

  /* ── track mouse position relative to the core ── */
  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) - R;
    const y = (e.clientY - rect.top) - R;
    mouseRef.current = { x, y, active: true };
  }, [R]);
  const handleLeave = useCallback(() => {
    mouseRef.current = { ...mouseRef.current, active: false };
  }, []);
  const handleClick = useCallback(() => {
    if (!interactive) return;
    audio.init();
    sfx("monadBlast");
    audio.play("monadBlast");
    setSurge((n) => n + 1);
    surgeTimeRef.current = performance.now();
    onSurge?.();
  }, [interactive, onSurge]);

  /* ── main render loop ── */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { c.width = size * dpr; c.height = size * dpr; };
    resize();
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();

    /* "breakout" event — a random sperm occasionally breaks orbit toward the camera
       and then returns, like a cinematic flyby. */
    const breakouts: Array<{
      sperm: OrbitSperm;
      t0: number;
      duration: number;
      home: { x: number; y: number };
    }> = [];

    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // ── background energy field — dark + radial glow ──
      const field = ctx.createRadialGradient(R, R, 8, R, R, size * 0.6);
      const surgeK = Math.max(0, 1 - (now - surgeTimeRef.current) / 1500);
      const breath = 1 + Math.sin(t * 0.8) * 0.04;
      field.addColorStop(0, `rgba(168,85,247,${(0.32 + surgeK * 0.4) * intensity})`);
      field.addColorStop(0.4, "rgba(80,30,160,.18)");
      field.addColorStop(1, "rgba(2,0,10,0)");
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, size, size);

      // ── rotating outer rings ──
      const ringPulse = 1 + surgeK * 0.5;
      for (let i = 0; i < 3; i++) {
        const baseR = CORE_R * (1.7 + i * 0.7) * breath;
        const r = baseR * ringPulse;
        ctx.save();
        ctx.translate(R, R);
        ctx.rotate(t * (0.05 + i * 0.04) * (i % 2 === 0 ? 1 : -1));
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168,85,247,${(0.20 - i * 0.04) * intensity})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // tick marks on outer ring
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          const r1 = r, r2 = r + 6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
          ctx.strokeStyle = `rgba(196,181,253,${0.3 - i * 0.06})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── spiral MON particles flowing toward the core ──
      for (let i = 0; i < 24; i++) {
        const life = ((t * 0.18 + i / 24) % 1);
        const a = i * 2.4 + t * 0.18;
        const r = (1 - life) * (size * 0.42);
        const px = R + Math.cos(a) * r;
        const py = R + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(px, py, (1 - life) * 2.4 + 0.4, 0, Math.PI * 2);
        ctx.fillStyle = i % 5 === 0
          ? `rgba(255,215,0,${(life * 0.8 * intensity)})`
          : `rgba(196,181,253,${(life * 0.55 * intensity)})`;
        ctx.fill();
      }

      // ── floating free MON crystals outside the core ring ──
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.05;
        const r = size * 0.38 + Math.sin(t * 0.6 + i) * 6;
        const px = R + Math.cos(a) * r;
        const py = R + Math.sin(a) * r;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 0.5 + i);
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,215,0,${(0.7 + Math.sin(t * 2 + i) * 0.2) * intensity})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.18 * intensity})`;
        ctx.fill();
        ctx.restore();
      }

      // The Monad logo "core" — drawn as the actual SVG via a DOM overlay (see JSX),
      // with a glow background painted on canvas. The official logo is NEVER
      // stretched, warped, or repainted on top of its own glyphs.

      // Glow behind the core
      const coreGlow = ctx.createRadialGradient(R, R, 2, R, R, CORE_R * 1.8);
      const proximityBoost = (mouseRef.current.active
        ? Math.max(0, 1 - Math.hypot(mouseRef.current.x, mouseRef.current.y) / 180)
        : 0) * 0.4;
      coreGlow.addColorStop(0, `rgba(233,213,255,${(0.95 + surgeK * 0.05) * intensity})`);
      coreGlow.addColorStop(0.3, `rgba(168,85,247,${(0.5 + surgeK * 0.5 + proximityBoost) * intensity})`);
      coreGlow.addColorStop(0.7, `rgba(80,30,160,${(0.18 + proximityBoost * 0.3) * intensity})`);
      coreGlow.addColorStop(1, "rgba(2,0,10,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(R, R, CORE_R * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // rotating monad-style inner ring (decorative — the real logo is overlaid as DOM)
      ctx.save();
      ctx.translate(R, R);
      ctx.rotate(t * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, CORE_R * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // inner sparkles
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = Math.cos(a) * CORE_R * 0.78;
        const y = Math.sin(a) * CORE_R * 0.78;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fill();
      }
      ctx.restore();

      // surge ring (expanding white/purple ring after click)
      if (surgeK > 0) {
        const ringR = CORE_R + (1 - surgeK) * size * 0.55;
        ctx.beginPath();
        ctx.arc(R, R, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(233,213,255,${surgeK * 0.7})`;
        ctx.lineWidth = 6 * surgeK;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(R, R, ringR * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168,85,247,${surgeK * 0.5})`;
        ctx.lineWidth = 3 * surgeK;
        ctx.stroke();
      }

      // ── orbiting sperm — z-sorted so some go behind / some in front ──
      const mouse = mouseRef.current;
      const mouseX = mouse.x, mouseY = mouse.y, mouseA = mouse.active;
      const speedScale = mouseA
        ? 1 + Math.max(0, 1 - Math.hypot(mouseX, mouseY) / 220) * 0.5
        : 1;

      // build the orbit positions
      const positions: Array<{ s: OrbitSperm; x: number; y: number; scale: number; rot: number; alpha: number }> = [];

      // sometimes spawn a breakout event (1-2 per orbit life)
      if (spermRef.current.length > 0 && Math.random() < 0.0009 && breakouts.length === 0) {
        const s = spermRef.current[Math.floor(Math.random() * spermRef.current.length)];
        breakouts.push({
          sperm: s,
          t0: now,
          duration: 2600,
          home: { x: 0, y: 0 }, // filled in below
        });
      }

      for (let i = 0; i < spermRef.current.length; i++) {
        const s = spermRef.current[i];
        // base orbit position
        const a = s.baseAngle + t * s.speed * speedScale + Math.sin(t * s.wobble + s.seed) * 0.08;
        const baseR = size * s.radiusFactor * 0.5;
        const ox = R + Math.cos(a) * baseR;
        const oy = R + Math.sin(a) * baseR;

        // depth scale (perspective illusion)
        const depthScale = 0.78 + s.depth * 0.45;
        const rot = a + Math.PI / 2; // sperm faces along the orbital tangent

        // is this sperm in a breakout?
        const bo = breakouts.find((b) => b.sperm.id === s.id);
        let bx = ox, by = oy, bScale = depthScale, bRot = rot, bAlpha = 1;
        if (bo) {
          const k = Math.min(1, (now - bo.t0) / bo.duration);
          // out: swim toward camera (right & down), then return
          const ease = Math.sin(k * Math.PI);
          bx = ox + ease * size * 0.18 * Math.cos(a);
          by = oy + ease * size * 0.18 * Math.sin(a);
          bScale = depthScale + ease * 0.6;
          bRot = a + Math.PI / 2 + ease * 0.5;
          if (k >= 1) breakouts.splice(breakouts.indexOf(bo), 1);
        }

        // cursor pull: when mouse is near the orbit, particles drift toward the cursor
        if (mouseA) {
          const d = Math.hypot(bx + mouseX, by + mouseY);
          if (d < 180) {
            const pull = (1 - d / 180) * 0.6;
            bx += (mouseX / Math.max(1, d)) * pull;
            by += (mouseY / Math.max(1, d)) * pull;
          }
        }

        // back-layer sperm render BEHIND the core; front-layer IN FRONT
        // We render back layer first, then core glow, then front layer.
        positions.push({ s, x: bx, y: by, scale: bScale * depthScale, rot: bRot, alpha: 1 });
      }

      // split positions by depth
      const behind = positions.filter((p) => p.s.depth < 0).sort((a, b) => a.s.depth - b.s.depth);
      const infront = positions.filter((p) => p.s.depth >= 0).sort((a, b) => a.s.depth - b.s.depth);

      // render behind layer
      for (const p of behind) renderSperm(ctx, p, t, intensity);
      // render the core outline ring on top of behind-layer (so it occludes)
      ctx.beginPath();
      ctx.arc(R, R, CORE_R * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fill();
      // render front layer on top
      for (const p of infront) renderSperm(ctx, p, t, intensity);

      // ── mouse-follow particles on hover ──
      if (mouseA) {
        const dm = Math.hypot(mouseX, mouseY);
        if (dm < 200) {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = dm + Math.random() * 40;
            const px = R + Math.cos(a) * r;
            const py = R + Math.sin(a) * r;
            ctx.beginPath();
            ctx.arc(px, py, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(196,181,253,0.7)";
            ctx.fill();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, intensity, R, CORE_R]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      data-surge={surge}
      className={`relative select-none ${interactive ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: `scale(${1 + surge * 0.02})` }}
      />
      {/* The official Monad logo — NEVER distorted. Drawn at the exact center,
          over the canvas glow, and on top of the orbiting sperm (when on the
          front-most layer). It is the centerpiece of the visual identity. */}
      <div
        className="absolute inset-0 grid place-items-center pointer-events-none"
        style={{ filter: `drop-shadow(0 0 ${10 * intensity}px rgba(168,85,247,.8))` }}
      >
        <div
          style={{
            width: CORE_R * 1.45,
            height: CORE_R * 1.45,
            animation: "monad-core-bob 4s ease-in-out infinite",
          }}
          className="grid place-items-center"
        >
          <MonadLogo size={Math.round(CORE_R * 1.5)} />
        </div>
      </div>
    </div>
  );
}

/* ── helper: draw one cartoon sperm at (x,y) with given scale/rotation ── */
function renderSperm(
  ctx: CanvasRenderingContext2D,
  p: { s: OrbitSperm; x: number; y: number; scale: number; rot: number; alpha: number },
  t: number,
  intensity: number
): void {
  const { s, x, y, scale, rot, alpha } = p;
  // depth-based transparency
  const depthAlpha = 0.55 + 0.45 * Math.min(1, Math.max(0, scale));
  const a = alpha * depthAlpha;
  ctx.save();
  ctx.globalAlpha = a;
  // tiny scale pulse
  const sp = 1 + Math.sin(t * 4 + s.seed) * 0.04;
  // "boosting" flag for tail flame
  const boost = s.layer === 0; // inner ring always boosts
  drawSpermByCharacter(ctx, s.characterId, {
    x, y, r: s.size * scale * sp, angle: rot, time: t * 1000,
    color: s.color, expression: "happy", effort: 0.7 + s.wobble * 0.3,
    boosting: boost, seed: s.seed,
  });
  ctx.restore();
}
