"use client";

import React, { useEffect, useRef } from "react";
import MonadLogo from "./monad-logo";

/**
 * The big rotating Monad egg — used as a hero visual in the landing page,
 * dashboard, multiplayer portal, and victory screen.
 *
 * The OUTER egg rotates slowly; the Monad logo inside counter-rotates
 * subtly. Surrounding rings + drifting MON particles + tiny swimming sperm
 * compose the focal point of a page.
 */
export default function MonadEgg({ size = 220, intensity = 1 }: { size?: number; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const R = size / 2;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { c.width = R * 2 * dpr; c.height = R * 2 * dpr; };
    resize();
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const start = performance.now();
    let raf = 0;

    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, R * 2, R * 2);

      // outermost glow rings
      for (let i = 0; i < 4; i++) {
        const r = (R * 0.9) * (i + 1) + Math.sin(t * 0.001 + i) * 6;
        ctx.beginPath();
        ctx.arc(R, R, Math.min(R * 1.4, r), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168,85,247,${0.14 - i * 0.025})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // rotating particles
      const N = 14;
      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2 + t * 0.0006;
        const r = R * 1.18 + Math.sin(t * 0.002 + i) * 6;
        const px = R + Math.cos(ang) * r;
        const py = R + Math.sin(ang) * r;
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(t * 0.004 + i) * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? "rgba(255,215,0,.6)" : "rgba(196,181,253,.55)";
        ctx.fill();
      }

      // spiralling MON particles
      for (let i = 0; i < 18; i++) {
        const life = ((t * 0.0003 + i / 18) % 1);
        const ang = i * 2.2 + t * 0.001;
        const r = (1 - life) * R * 1.5;
        const px = R + Math.cos(ang) * r;
        const py = R + Math.sin(ang) * r;
        ctx.beginPath();
        ctx.arc(px, py, (1 - life) * 2.6 + 0.4, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0
          ? `rgba(255,215,0,${life * 0.7})`
          : `rgba(196,181,253,${life * 0.5})`;
        ctx.fill();
      }

      // tiny swimming sperm in the ring
      for (let i = 0; i < 2; i++) {
        const a = t * 0.0009 * (i === 0 ? 1 : -1) + i * Math.PI;
        const r = R * 1.32;
        const px = R + Math.cos(a) * r;
        const py = R + Math.sin(a) * r;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "rgba(196,181,253,.8)" : "rgba(255,122,217,.8)";
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [R]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size, transform: `scale(${1 + (intensity - 1) * 0.06})` }}
    >
      <canvas
        ref={canvasRef}
        width={R * 2}
        height={R * 2}
        className="absolute inset-0"
      />
      {/* The egg itself — a CSS-tilted 3D-style oval with the Monad logo embedded */}
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ filter: `drop-shadow(0 0 ${22 * intensity}px rgba(168,85,247,${0.55 * intensity}))` }}
      >
        <div
          className="monad-egg-spin relative"
          style={{ width: R * 1.3, height: R * 1.3 }}
        >
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <defs>
              <radialGradient id="eggGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffdcef" />
                <stop offset="70%" stopColor="#ff8fd0" />
                <stop offset="100%" stopColor="#7c3aed" />
              </radialGradient>
              <filter id="eggBlur"><feGaussianBlur stdDeviation="0.3" /></filter>
            </defs>
            <ellipse cx="60" cy="60" rx="52" ry="58" fill="url(#eggGrad)" />
            {/* glossy top highlight */}
            <ellipse cx="44" cy="40" rx="14" ry="9" fill="rgba(255,255,255,0.55)" />
            {/* rim shadow */}
            <ellipse cx="60" cy="60" rx="52" ry="58" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div
              className="monad-egg-inner"
              style={{ width: "44%", height: "44%", filter: "drop-shadow(0 0 6px rgba(255,255,255,.45))" }}
            >
              <MonadLogo size={size} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
