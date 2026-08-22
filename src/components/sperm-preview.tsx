"use client";

import React, { useRef, useEffect } from "react";
import { drawSpermByCharacter } from "@/lib/sperm-art";
import { CHARACTERS, getCharacterDef } from "@/lib/game-config";

interface Props {
  characterId: string;
  size?: number;
  /** turntable rotation like a 3D showcase */
  showcase?: boolean;
  boosting?: boolean;
  className?: string;
}

/**
 * Live-animated sperm on a small canvas. Used in character selection,
 * the showcase panel and game-mode preview cards.
 */
export default function SpermPreview({
  characterId, size = 140, showcase = false, boosting = false, className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const char = getCharacterDef(characterId);

    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size * 0.56;
      const cy = size / 2;
      const r = size * 0.16;

      // soft platform glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
      g.addColorStop(0, char.color + "22");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // orbiting sparkles (fake depth / 3D showcase feel)
      if (showcase) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + t * 0.0011;
          const rx = size * 0.34, ry = size * 0.12;
          const px = cx + Math.cos(a) * rx;
          const py = cy + Math.sin(a) * ry + size * 0.22;
          const depth = (Math.sin(a) + 1) / 2;
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + depth * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196,181,253,${0.15 + depth * 0.45})`;
          ctx.fill();
        }
      }

      // gentle bob + slight yaw so it reads as a turntable
      const bob = Math.sin(t * 0.0022) * size * 0.03;
      const yaw = showcase ? Math.sin(t * 0.0009) * 0.28 : Math.sin(t * 0.0015) * 0.1;

      drawSpermByCharacter(ctx, char.id, {
        x: cx, y: cy + bob, r,
        angle: yaw,
        time: t,
        color: char.color,
        expression: "happy",
        effort: boosting ? 1 : 0.55,
        boosting,
        seed: 2.3,
        scale: 1 + Math.sin(t * 0.0022) * 0.02,
      });

      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [characterId, size, showcase, boosting]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
