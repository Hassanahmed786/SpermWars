"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { drawSpermByCharacter } from "@/lib/sperm-art";
import { getSocket, connectSocket } from "@/lib/socket-client";
import { sfx } from "@/lib/audio";

/**
 * The dashboard's marquee "PLAY MULTIPLAYER" button.
 * - little sperm swim around it on a canvas
 * - a light sweep passes across every few seconds
 * - shows the REAL online count if the server reports one, otherwise a neutral
 *   "ONLINE MULTIPLAYER" label (never a fabricated number)
 */
export default function MultiplayerHeroButton() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const [pressing, setPressing] = useState(false);

  /* lightweight connection just to read the live online count */
  useEffect(() => {
    const s = getSocket();
    const onCount = (n: number) => setOnline(typeof n === "number" ? n : null);
    s.on("onlineCount", onCount);
    connectSocket();
    const t = setTimeout(() => { if (s.connected) s.emit("getOnline"); }, 800);
    return () => { s.off("onlineCount", onCount); clearTimeout(t); };
  }, []);

  /* swimmers */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr; c.height = r.height * dpr;
    };
    resize();
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const ids = ["space", "chaos", "crypto", "ai"];
    let raf = 0;
    const loop = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = c.width / dpr, h = c.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ids.forEach((id, i) => {
        const speed = 0.00016 + i * 0.00004;
        const px = ((t * speed * w + (i * w) / ids.length) % (w + 120)) - 60;
        const py = h / 2 + Math.sin(t * 0.002 + i * 1.7) * (h * 0.28);
        const ang = Math.sin(t * 0.002 + i * 1.7) * 0.5;
        ctx.globalAlpha = 0.5;
        drawSpermByCharacter(ctx, id, {
          x: px, y: py, r: 9, angle: ang, time: t,
          color: ["#00d4ff", "#ff1493", "#ffd700", "#39ff14"][i],
          expression: "happy", effort: 0.8, boosting: true, seed: i,
        });
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const go = () => {
    sfx("click");
    setPressing(true);
    setTimeout(() => router.push("/multiplayer"), 220);
  };

  return (
    <button
      onMouseEnter={() => { setHover(true); sfx("hover"); }}
      onMouseLeave={() => setHover(false)}
      onClick={go}
      className="relative w-full rounded-3xl overflow-hidden text-left transition-transform mp-hero-pulse"
      style={{
        transform: pressing ? "scale(.97)" : hover ? "scale(1.03)" : "scale(1)",
        transition: "transform .18s cubic-bezier(.2,.8,.3,1)",
        padding: "1.75rem 1.5rem",
        background: "linear-gradient(120deg, rgba(168,85,247,.28), rgba(120,20,180,.22) 45%, rgba(20,4,40,.85))",
        border: "1px solid rgba(167,139,250,.55)",
        boxShadow: hover
          ? "0 26px 70px -20px rgba(168,85,247,.7), 0 0 46px -10px rgba(168,85,247,.6)"
          : "0 16px 50px -24px rgba(0,0,0,.85), 0 0 26px -14px rgba(139,92,246,.5)",
      }}
    >
      {/* swimming sperm layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />
      {/* light sweep */}
      <span className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(105deg,transparent 38%,rgba(255,255,255,.16) 50%,transparent 62%)",
        backgroundSize: "220% 100%",
        animation: "shimmer 3.4s linear infinite",
      }} />
      {/* MON particles */}
      <span className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="absolute rounded-full"
            style={{
              left: `${(i * 37) % 100}%`, bottom: "-8px",
              width: 3 + (i % 3), height: 3 + (i % 3),
              background: i % 2 ? "#ffd700" : "#c4b5fd",
              boxShadow: `0 0 6px ${i % 2 ? "#ffd700" : "#c4b5fd"}`,
              animation: `mon-rise ${3 + (i % 4)}s linear ${(i % 5) * 0.4}s infinite`,
            }} />
        ))}
      </span>

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.35em] text-purple-200/70 mb-1">HERO FEATURE</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow"
            style={{ textShadow: "0 0 24px rgba(168,85,247,.7)" }}>
            🧬 PLAY MULTIPLAYER
          </h2>
          <p className="text-[11px] text-purple-200/70 mt-1">
            Up to 8 sperm · Quick Match · Rooms · Real-time chaos
          </p>
          <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px #39ff14" }} />
            {online !== null ? `${online} PLAYER${online === 1 ? "" : "S"} ONLINE` : "ONLINE MULTIPLAYER"}
          </span>
        </div>
        <div className="shrink-0 text-3xl md:text-4xl transition-transform"
          style={{ transform: hover ? "translateX(4px)" : "translateX(0)" }}>→</div>
      </div>
    </button>
  );
}
