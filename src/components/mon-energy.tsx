"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Floating MON-energy particles — drawn on a canvas. Used as a tiny
 * accent beside a wallet balance to add ambient life, or as a celebratory
 * burst that flies toward the balance indicator when `burst` increments.
 */
export default function MonEnergy({
  size = 64,
  density = 18,
  burst = 0,
  hue = 0,
}: {
  size?: number;
  density?: number;
  burst?: number;     // increment to fire a celebratory burst
  hue?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string }>>([]);
  const burstRef = useRef(burst);
  const startRef = useRef(0);

  useEffect(() => { burstRef.current = burst; }, [burst]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { c.width = size * dpr; c.height = size * dpr; };
    resize();
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const loop = (now: number) => {
      if (startRef.current === 0) startRef.current = now;
      const t = (now - startRef.current) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // ambient drifting particles
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = size; if (p.x > size) p.x = 0;
        if (p.y < 0) p.y = size; if (p.y > size) p.y = 0;
        const a = (Math.sin(t * 2 + p.x) + 1) / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = a;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // burst particles — fly toward top-right (wallet) over 1.4s
      if (burstRef.current > 0) {
        for (let i = 0; i < 18; i++) {
          const k = ((t * 0.7 + i / 18) % 1);
          const sx = size * 0.5 + Math.cos(i * 1.7) * 22;
          const sy = size * 0.85 - Math.sin(i * 1.7) * 22;
          const tx = size - 10;
          const ty = 10;
          const x = sx + (tx - sx) * k;
          const y = sy + (ty - sy) * k;
          const r = (1 - k) * 3 + 0.8;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = k < 0.7 ? "#ffd700" : "#836ef9";
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // seed
    particlesRef.current = Array.from({ length: density }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      life: 1, max: 1, r: 0.8 + Math.random() * 1.4,
      c: Math.random() > 0.7 ? "rgba(255,215,0,0.8)" : "rgba(196,181,253,0.7)",
    }));

    return () => cancelAnimationFrame(raf);
  }, [size, density]);

  return <canvas ref={canvasRef} width={size} height={size} className="block" style={{ width: size, height: size }} />;
}

/** A drop-in "balance chip" that animates upward when `value` increases. */
export function AnimatedBalance({ value }: { value: string }) {
  const [pulse, setPulse] = useState(0);
  const lastRef = useRef(value);
  useEffect(() => {
    if (value !== lastRef.current) {
      // Re-key the span so the CSS pop animation replays on balance change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPulse((n) => n + 1);
      lastRef.current = value;
    }
  }, [value]);
  return (
    <span key={pulse} className="num-pop inline-block">{value}</span>
  );
}
