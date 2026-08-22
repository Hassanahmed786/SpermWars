"use client";

import { io, Socket } from "socket.io-client";

export interface MpPlayer {
  id: string;
  name: string;
  characterId: string;
  ready: boolean;
  wallet?: string | null;
  connected: boolean;
  isHost: boolean;
}

export interface JoinInfo {
  id: string;
  name: string;
  characterId: string;
  wallet?: string | null;
}

export interface SerializedGameState {
  players: Array<{
    id: string; name: string; characterId: string;
    x: number; y: number; vx: number; vy: number;
    health: number; maxHealth: number; energy: number; mon: number;
    alive: boolean; facing: number; isAI: boolean; radius: number;
  }>;
  monCrystals: Array<{ id: string; x: number; y: number; value: number; radius: number }>;
  timeRemaining: number;
  gamePhase: string;
  winner: string | null;
  eventAnnouncement: string | null;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    socket = io(url, {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      timeout: 6000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}

/** Stable per-tab identity so reconnects rejoin the same slot. */
export function getPlayerId(): string {
  if (typeof window === "undefined") return "server";
  const KEY = "spermwars.playerId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "p_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "Swimmer";
  const KEY = "spermwars.playerName";
  let n = localStorage.getItem(KEY);
  if (!n) {
    n = "Swimmer_" + Math.random().toString(36).slice(2, 5).toUpperCase();
    localStorage.setItem(KEY, n);
  }
  return n;
}

export function setPlayerName(name: string): void {
  if (typeof window !== "undefined") localStorage.setItem("spermwars.playerName", name.slice(0, 20));
}
