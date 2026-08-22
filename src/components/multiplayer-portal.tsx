"use client";

import React, { useRef, useEffect } from "react";
import { drawSpermByCharacter } from "@/lib/sperm-art";

/**
 * Animated purple vortex with sperm swimming toward the centre and an egg
 * glowing in the depths. Used as the multiplayer backdrop and the entry
 * transition (variant="transition" briefly zooms through it).
 */
export default function MultiplayerPortal({
  variant = "backdrop",
}: { variant?: "backdrop" | "transition" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr; };
    resize();
    const ctx = c.getContext("2d");
    if (!ctx) return;
    window.addEventListener("resize", resize);

    const ids = ["space", "chaos", "crypto", "ai", "scientist", "politician"];
    const swimmers = ids.map((id, i) => ({
      id, a: (i / ids.length) * Math.PI * 2, r: 0.9 + Math.random() * 0.3,
      col: ["#00d4ff", "#ff1493", "#ffd700", "#39ff14", "#bf5fff", "#ff6b35"][i],
    }));
    const start = performance.now();
    let raf = 0;

    const loop = (t: number) => {
      const W = c.width / dpr, H = c.height / dpr;
      const cx = W / 2, cy = H / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // deep radial background
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, "#2a0450");
      bg.addColorStop(0.4, "#12012a");
      bg.addColorStop(1, "#04000a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const zoom = variant === "transition"
        ? 1 + Math.min(3.2, (t - start) / 500)
        : 1;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // vortex arms
      for (let arm = 0; arm < 5; arm++) {
        ctx.beginPath();
        for (let s = 0; s < 80; s++) {
          const th = (s / 80) * Math.PI * 3 + (arm / 5) * Math.PI * 2 + t * 0.0009;
          const rr = (s / 80) * Math.min(W, H) * 0.6;
          const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(168,85,247,${0.16 - arm * 0.02})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // pulsing rings
      for (let i = 0; i < 4; i++) {
        const rr = (Math.min(W, H) * 0.14) * (i + 1) + Math.sin(t * 0.002 + i) * 8;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(196,181,253,${0.14 - i * 0.02})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // MON particles spiralling inward
      for (let i = 0; i < 60; i++) {
        const life = ((t * 0.0004 + i / 60) % 1);
        const th = i * 2.4 + t * 0.001;
        const rr = (1 - life) * Math.min(W, H) * 0.55;
        const px = Math.cos(th) * rr, py = Math.sin(th) * rr;
        ctx.beginPath();
        ctx.arc(px, py, (1 - life) * 3 + 0.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 4 === 0 ? `rgba(255,215,0,${life * 0.7})` : `rgba(196,181,253,${life * 0.5})`;
        ctx.fill();
      }

      // egg glowing in the core
      const eggR = 44 + Math.sin(t * 0.003) * 5;
      const eg = ctx.createRadialGradient(-eggR * 0.3, -eggR * 0.3, 4, 0, 0, eggR);
      eg.addColorStop(0, "#ffffff"); eg.addColorStop(0.4, "#ffb6e0"); eg.addColorStop(1, "#8b5cf6");
      ctx.beginPath(); ctx.arc(0, 0, eggR, 0, Math.PI * 2);
      ctx.fillStyle = eg; ctx.fill();

      // sperm swimming toward the egg
      for (const sw of swimmers) {
        const orbit = Math.min(W, H) * 0.33 * sw.r * (0.7 + Math.sin(t * 0.0008 + sw.a) * 0.3);
        const ang = sw.a + t * 0.0006;
        const px = Math.cos(ang) * orbit;
        const py = Math.sin(ang) * orbit;
        drawSpermByCharacter(ctx, sw.id, {
          x: px, y: py, r: 13, angle: ang + Math.PI / 2 + Math.PI, time: t,
          color: sw.col, expression: "determined", effort: 1, boosting: true, seed: sw.a,
        });
      }

      ctx.restore();

      // vignette
      const vg = ctx.createRadialGradient(cx, cy, H * 0.28, cx, cy, H * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,.6)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [variant]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden />;
}
