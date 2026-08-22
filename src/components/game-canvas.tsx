"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  GameState, createGameState, createPlayer,
  updateGame, spawnMonCrystals,
  triggerRandomEvent, setEngineHooks, type PlayerInput,
} from "@/lib/game-engine";
import { audio, sfx as playSfx, type Sfx } from "@/lib/audio";
import {
  renderGame, createCamera, updateCamera, type Camera,
} from "@/lib/game-renderer";
import { CHARACTERS, RANDOM_EVENT_INTERVAL_MIN, RANDOM_EVENT_INTERVAL_MAX, PARALLEL_EVENT_INTERVAL } from "@/lib/game-config";
import SpermPreview from "@/components/sperm-preview";

interface GameCanvasProps {
  localPlayerId: string;
  localPlayerName: string;
  characterId: string;
  onGameEnd?: (winnerId: string, stats: { mon: number; kills: number; placement: number }) => void;
}

export default function GameCanvas({
  localPlayerId,
  localPlayerName,
  characterId,
  onGameEnd,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const cameraRef = useRef<Camera>(createCamera());
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const [gamePhase, setGamePhase] = useState<"countdown" | "playing" | "ended">("countdown");
  const [countdown, setCountdown] = useState(3);
  /** Snapshot taken when the match ends so the victory screen never reads a ref during render. */
  const [winner, setWinner] = useState<null | { id: string; name: string; characterId: string; mon: number }>(null);
  const lastEventRef = useRef<number>(0);
  const lastParallelRef = useRef<number>(0);
  const gameEndedRef = useRef<boolean>(false);
  // Touch controls
  const [touchDir, setTouchDir] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Browser-only probe: cannot run during SSR and would hydrate-mismatch as initial state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const initGame = useCallback(() => {
    const state = createGameState();
    state.players.clear();
    state.monCrystals = [];
    state.particles = [];
    state.immuneCells = [];
    state.activeEvents = [];
    state.timeRemaining = 120;
    state.gamePhase = "playing";
    state.winner = null;
    state.eventAnnouncement = null;
    state.gravityFlipped = false;
    state.fluidCurrent = { x: 0, y: 0 };

    const localPlayer = createPlayer(localPlayerId, localPlayerName, characterId, false);
    state.players.set(localPlayerId, localPlayer);

    const aiChars = CHARACTERS.filter((c) => c.id !== characterId);
    for (let i = 0; i < 5; i++) {
      const charDef = aiChars[i % aiChars.length];
      const aiPlayer = createPlayer(`ai-${i}`, charDef.name, charDef.id, true);
      state.players.set(aiPlayer.id, aiPlayer);
    }

    spawnMonCrystals(state, 20);

    const now = performance.now();
    state.gameStartTime = now;
    lastEventRef.current = now;
    lastParallelRef.current = now;
    lastTimeRef.current = 0;
    gameEndedRef.current = false;
    stateRef.current = state;
  }, [localPlayerId, localPlayerName, characterId]);

  // engine -> audio + cross-component bridge
  useEffect(() => {
    setEngineHooks({
      onSound: (s) => playSfx(s as Sfx),
      onMonadBlast: (x, y) => {
        // broadcast a DOM event the page can pick up (meme push, etc.)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("spermwars:monadBlast", { detail: { x, y } }));
        }
      },
    });
    audio.init();
    audio.setScene("arena");
    return () => { setEngineHooks({}); audio.setScene("menu"); };
  }, []);

  useEffect(() => {
    initGame();
    // gamePhase already initialises to "countdown"; handlePlayAgain resets it explicitly.
    // This kicks off the timed 3-2-1 sequence on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(3);
    playSfx("countdown");
    const t1 = setTimeout(() => { setCountdown(2); playSfx("countdown"); }, 1000);
    const t2 = setTimeout(() => { setCountdown(1); playSfx("countdown"); }, 2000);
    const t3 = setTimeout(() => { setCountdown(0); setGamePhase("playing"); playSfx("go"); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","1","2","3","4","5","6","m","q","e"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, []);

  // Touch joystick handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - touchStartRef.current.x) / 50;
    const dy = (touch.clientY - touchStartRef.current.y) / 50;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      setTouchDir({ dx: dx / len, dy: dy / len });
    } else {
      setTouchDir({ dx, dy });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    setTouchDir({ dx: 0, dy: 0 });
  }, []);

  useEffect(() => {
    const loop = (timestamp: number) => {
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) { animFrameRef.current = requestAnimationFrame(loop); return; }

      const camera = cameraRef.current;
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = timestamp;

      const container = canvas.parentElement;
      if (container) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (gamePhase === "playing") {
        const keys = keysRef.current;
        let dx = touchDir.dx, dy = touchDir.dy;
        if (keys.has("w") || keys.has("arrowup")) dy -= 1;
        if (keys.has("s") || keys.has("arrowdown")) dy += 1;
        if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
        if (keys.has("d") || keys.has("arrowright")) dx += 1;

        const input: PlayerInput = {
          dx, dy,
          dash: keys.has(" "),
          ability: keys.has("1") || keys.has("2") || keys.has("3") || keys.has("4") || keys.has("5") || keys.has("6"),
          monadBlast: keys.has("m"),
          suck: keys.has("q"),
          blast: keys.has("e"),
        };

        const inputs = new Map<string, PlayerInput>();
        inputs.set(localPlayerId, input);
        updateGame(state, dt, timestamp, inputs);

        const timeSinceEvent = timestamp - lastEventRef.current;
        if (timeSinceEvent > RANDOM_EVENT_INTERVAL_MIN + Math.random() * (RANDOM_EVENT_INTERVAL_MAX - RANDOM_EVENT_INTERVAL_MIN)) {
          triggerRandomEvent(state, timestamp);
          lastEventRef.current = timestamp;
        }

        const timeSinceParallel = timestamp - lastParallelRef.current;
        if (timeSinceParallel > PARALLEL_EVENT_INTERVAL && !state.parallelEventActive) {
          state.parallelEventActive = true;
          state.parallelEventChoiceEnd = timestamp + 4000;
          state.eventAnnouncement = "✨ MONAD PARALLEL EVENT — ALL CHOOSE SIMULTANEOUSLY";
          state.eventAnnouncementEnd = timestamp + 3000;
          lastParallelRef.current = timestamp;
        }
        if (state.parallelEventActive && timestamp > state.parallelEventChoiceEnd) {
          state.parallelEventActive = false;
          state.parallelEventResolving = false;
        }

        if ((state.gamePhase as string) === "ended" && !gameEndedRef.current) {
          gameEndedRef.current = true;
          setGamePhase("ended");
          {
            const w = state.winner ? state.players.get(state.winner) : undefined;
            setWinner(state.winner
              ? { id: state.winner, name: w?.name ?? "UNKNOWN", characterId: w?.characterId ?? "space", mon: w?.mon ?? 0 }
              : null);
          }
          const localP = state.players.get(localPlayerId);
          if (localP && onGameEnd) {
            const allPlayers = Array.from(state.players.values());
            const alive = allPlayers.filter((p) => p.alive);
            const placement = alive.includes(localP) ? 1 : allPlayers.indexOf(localP) + 1;
            onGameEnd(state.winner || "", { mon: localP.mon, kills: localP.kills, placement });
          }
        }
      }

      const localPlayer = state.players.get(localPlayerId);
      if (localPlayer) updateCamera(camera, localPlayer.pos);

      renderGame(ctx, canvas, state, camera, localPlayerId, timestamp);

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [gamePhase, localPlayerId, onGameEnd, touchDir]);

  const handlePlayAgain = () => {
    initGame();
    setGamePhase("countdown");
    setCountdown(3);
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => { setCountdown(0); setGamePhase("playing"); }, 3000);
  };

  const handleAbilityTouch = (key: string) => {
    keysRef.current.add(key);
    setTimeout(() => keysRef.current.delete(key), 100);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0014]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Touch joystick area */}
      {isMobile && gamePhase === "playing" && (
        <div
          className="absolute inset-0 z-5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none" }}
        />
      )}

      {/* Mobile ability buttons */}
      {isMobile && gamePhase === "playing" && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <button
            onTouchStart={() => handleAbilityTouch(" ")}
            className="w-14 h-14 rounded-full bg-purple-600/60 border-2 border-purple-400 text-white font-bold text-xs flex items-center justify-center"
          >
            DASH
          </button>
          <button
            onTouchStart={() => handleAbilityTouch("1")}
            className="w-14 h-14 rounded-full bg-purple-600/60 border-2 border-purple-400 text-white font-bold text-xs flex items-center justify-center"
          >
            ABIL
          </button>
          <button
            onTouchStart={() => handleAbilityTouch("m")}
            className="w-14 h-14 rounded-full bg-yellow-600/60 border-2 border-yellow-400 text-white font-bold text-xs flex items-center justify-center"
          >
            MON
          </button>
        </div>
      )}

      {/* Countdown */}
      {gamePhase === "countdown" && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center">
            <p className="text-9xl font-black neon-text animate-bounce">{countdown}</p>
            <p className="text-xl text-purple-400 mt-4">
              {countdown === 3 ? "GET READY" : countdown === 2 ? "SET" : "GO!"}
            </p>
          </div>
        </div>
      )}

      {/* Cinematic victory screen */}
      {gamePhase === "ended" && winner && (
        <div className="absolute inset-0 z-10 overflow-hidden"
          style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(60,10,90,.6), rgba(3,0,10,.92))", backdropFilter: "blur(6px)" }}>
          {/* confetti / MON fireworks */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 46 }, (_, i) => (
              <div key={i} className="absolute"
                style={{
                  left: `${(i * 53) % 100}%`,
                  top: "-6%",
                  width: 5 + (i % 4) * 3,
                  height: 5 + (i % 4) * 3,
                  borderRadius: i % 2 ? "50%" : "2px",
                  background: ["#ffd700", "#a855f7", "#ff4fa3", "#7ae0ff"][i % 4],
                  boxShadow: `0 0 8px ${["#ffd700", "#a855f7", "#ff4fa3", "#7ae0ff"][i % 4]}`,
                  animation: `confetti-fall ${2.4 + (i % 5) * 0.5}s linear ${(i % 10) * 0.15}s infinite`,
                }} />
            ))}
          </div>

          <div className="relative h-full flex flex-col items-center justify-center text-center p-8 modal-pop">
            {/* winner sperm */}
            <div className="mb-1">
              <SpermPreview characterId={winner.characterId} size={150} showcase boosting />
            </div>
            <div className="text-5xl mb-2 float-anim" style={{ filter: "drop-shadow(0 0 26px rgba(255,182,217,.7))" }}>🥚</div>
            <p className="text-xl font-bold text-purple-300 tracking-[0.3em] animate-pulse">THE EGG HAS CHOSEN</p>
            <p className="text-4xl md:text-5xl font-black text-white mt-2 title-glow">
              {winner.name}
            </p>
            <p className="text-lg tracking-[0.35em] mt-1"
              style={{ color: "#ffd700", textShadow: "0 0 20px rgba(255,215,0,.6)" }}>
              MONAD CHAMPION
            </p>
            {winner.mon > 0 && (
              <p className="text-base text-yellow-400 mt-3">💎 +{winner.mon} MON collected</p>
            )}
            <div className="flex gap-3 justify-center mt-8 flex-wrap">
              <button onClick={handlePlayAgain} className="glow-btn glow-btn-pink text-base px-8 py-3">🔄 PLAY AGAIN</button>
              <button onClick={() => window.location.href = "/multiplayer"} className="glow-btn text-base px-8 py-3">🧬 REMATCH ONLINE</button>
              <button onClick={() => window.location.href = "/leaderboard"} className="glow-btn text-base px-8 py-3">🏆 LEADERBOARD</button>
              <button onClick={() => window.location.href = "/dashboard"} className="glow-btn text-base px-8 py-3">🏠 DASHBOARD</button>
            </div>
          </div>
        </div>
      )}

      {/* Controls hint (desktop) */}
      {gamePhase === "playing" && !isMobile && (
        <div className="absolute bottom-2 right-2 z-10 text-[10px] text-purple-400/60 font-mono pointer-events-none">
          WASD Move · SPACE Dash · Q Suck · E Blast · 1-6 Ability · M MONAD BLAST
        </div>
      )}
    </div>
  );
}
