// Server-side game room management and Socket.IO handlers.
// Loaded by the custom server (server.ts).
//
// Adds on top of the original room primitives:
//  - live online player count broadcast (real, never fabricated)
//  - Quick Match matchmaking queue
//  - reconnect grace period (players are not instantly dropped)
//  - presence events (playerJoined / playerLeft) for lobby animations
//  - room-code lookups so shared links can auto-join

import { Server as SocketIOServer, Socket } from "socket.io";
import {
  GameState, createGameState, createPlayer, updateGame,
  spawnMonCrystals, triggerRandomEvent, type PlayerInput,
} from "./game-engine";
import { CHARACTERS, MAX_PLAYERS } from "./game-config";

interface RoomPlayer {
  id: string;
  name: string;
  characterId: string;
  ready: boolean;
  socketId: string;
  wallet?: string | null;
  connected: boolean;
  dropTimer?: ReturnType<typeof setTimeout> | null;
}

interface Room {
  id: string;
  players: Map<string, RoomPlayer>;
  state: GameState | null;
  hostId: string;          // player id of the host
  createdAt: number;
  started: boolean;
  loop?: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, Room>();
/** Quick-match queue: socketId -> player info awaiting a match. */
const queue = new Map<string, { socket: Socket; info: JoinInfo }>();

interface JoinInfo {
  id: string;
  name: string;
  characterId: string;
  wallet?: string | null;
}

const RECONNECT_GRACE_MS = 15_000;
const QUICK_MATCH_SIZE = 4;      // fill with AI if fewer real players after a short wait
const QUICK_MATCH_WAIT_MS = 6_000;

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(out) ? generateRoomId() : out;
}

/** Count of distinct connected sockets = real online players. */
function onlineCount(io: SocketIOServer): number {
  return io.sockets.sockets.size;
}

function broadcastOnline(io: SocketIOServer): void {
  io.emit("onlineCount", onlineCount(io));
}

function publicPlayers(room: Room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id, name: p.name, characterId: p.characterId,
    ready: p.ready, wallet: p.wallet ?? null, connected: p.connected,
    isHost: p.id === room.hostId,
  }));
}

export function setupGameServer(io: SocketIOServer): void {
  io.on("connection", (socket) => {
    broadcastOnline(io);
    socket.emit("onlineCount", onlineCount(io));

    /* ── online count on demand ── */
    socket.on("getOnline", () => socket.emit("onlineCount", onlineCount(io)));

    /* ── CREATE ROOM ── */
    socket.on("createRoom", (info: JoinInfo) => {
      const roomId = generateRoomId();
      const room: Room = {
        id: roomId, players: new Map(), state: null,
        hostId: info.id, createdAt: Date.now(), started: false, loop: null,
      };
      room.players.set(info.id, {
        ...info, ready: false, socketId: socket.id, connected: true, dropTimer: null,
      });
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerId = info.id;
      socket.emit("roomCreated", roomId, publicPlayers(room));
      io.to(roomId).emit("roomUpdated", publicPlayers(room));
    });

    /* ── JOIN ROOM ── */
    socket.on("joinRoom", (roomId: string, info: JoinInfo) => {
      const room = rooms.get((roomId || "").toUpperCase());
      if (!room) { socket.emit("mpError", "ROOM_NOT_FOUND", "Room not found"); return; }
      if (room.started) { socket.emit("mpError", "ROOM_STARTED", "Match already started"); return; }

      // reconnect path: same player id rejoining
      const existing = room.players.get(info.id);
      if (existing) {
        if (existing.dropTimer) { clearTimeout(existing.dropTimer); existing.dropTimer = null; }
        existing.socketId = socket.id;
        existing.connected = true;
      } else {
        if (room.players.size >= MAX_PLAYERS) { socket.emit("mpError", "ROOM_FULL", "Room is full"); return; }
        room.players.set(info.id, {
          ...info, ready: false, socketId: socket.id, connected: true, dropTimer: null,
        });
      }
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = info.id;
      socket.emit("roomJoined", room.id, publicPlayers(room));
      socket.to(room.id).emit("playerJoined", { id: info.id, name: info.name, characterId: info.characterId });
      io.to(room.id).emit("roomUpdated", publicPlayers(room));
    });

    /* ── SELECT CHARACTER ── */
    socket.on("selectCharacter", (roomId: string, playerId: string, characterId: string) => {
      const room = rooms.get(roomId);
      const p = room?.players.get(playerId);
      if (room && p) { p.characterId = characterId; io.to(room.id).emit("roomUpdated", publicPlayers(room)); }
    });

    /* ── READY TOGGLE ── */
    socket.on("ready", (roomId: string, playerId: string, ready = true) => {
      const room = rooms.get(roomId);
      const p = room?.players.get(playerId);
      if (!room || !p) return;
      p.ready = ready;
      io.to(room.id).emit("roomUpdated", publicPlayers(room));
      io.to(room.id).emit("playerReady", playerId, ready);
      const connected = Array.from(room.players.values()).filter((x) => x.connected);
      if (connected.length >= 1 && connected.every((x) => x.ready)) {
        io.to(room.id).emit("allReady");
      }
    });

    /* ── HOST STARTS ── */
    socket.on("startGame", (roomId: string, playerId: string) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== playerId || room.started) return;
      startGame(io, room.id);
    });

    /* ── QUICK MATCH ── */
    socket.on("quickMatch", (info: JoinInfo) => {
      queue.set(socket.id, { socket, info });
      socket.data.playerId = info.id;
      socket.emit("matchmaking", "SEARCHING");
      tryMatch(io);
      // fallback: after a wait, start with whoever is queued + AI
      setTimeout(() => {
        if (queue.has(socket.id)) forceMatch(io, socket.id);
      }, QUICK_MATCH_WAIT_MS);
    });

    socket.on("cancelQuickMatch", () => {
      queue.delete(socket.id);
      socket.emit("matchmaking", "CANCELLED");
    });

    /* ── LEAVE ── */
    socket.on("leaveRoom", (roomId: string) => {
      queue.delete(socket.id);
      const room = rooms.get(roomId);
      if (!room) return;
      removePlayerBySocket(io, room, socket.id, true);
      socket.leave(room.id);
    });

    /* ── real-time input (server-authoritative loop) ── */
    socket.on("playerInput", (roomId: string, playerId: string, input: PlayerInput) => {
      const room = rooms.get(roomId);
      if (room?.state) room.state.__inputs?.set(playerId, input);
    });

    /* ── DISCONNECT with grace period ── */
    socket.on("disconnect", () => {
      queue.delete(socket.id);
      broadcastOnline(io);
      for (const room of rooms.values()) {
        const p = Array.from(room.players.values()).find((x) => x.socketId === socket.id);
        if (!p) continue;
        p.connected = false;
        io.to(room.id).emit("roomUpdated", publicPlayers(room));
        io.to(room.id).emit("playerLeft", p.id, "disconnected");
        // grace: keep the slot for a while so they can reconnect
        p.dropTimer = setTimeout(() => {
          removePlayerBySocket(io, room, socket.id, false);
        }, RECONNECT_GRACE_MS);
      }
    });
  });

  // periodic online count refresh
  setInterval(() => broadcastOnline(io), 10_000);
}

function removePlayerBySocket(io: SocketIOServer, room: Room, socketId: string, immediate: boolean): void {
  for (const [id, p] of room.players) {
    if (p.socketId === socketId) {
      if (p.dropTimer) { clearTimeout(p.dropTimer); p.dropTimer = null; }
      room.players.delete(id);
      // reassign host if needed
      if (room.hostId === id) {
        const next = Array.from(room.players.values()).find((x) => x.connected);
        if (next) room.hostId = next.id;
      }
      break;
    }
  }
  if (room.players.size === 0) {
    if (room.loop) clearInterval(room.loop);
    rooms.delete(room.id);
  } else {
    io.to(room.id).emit("roomUpdated", publicPlayers(room));
  }
  void immediate;
}

/* ── matchmaking ── */
function tryMatch(io: SocketIOServer): void {
  if (queue.size < QUICK_MATCH_SIZE) return;
  const entries = Array.from(queue.values()).slice(0, QUICK_MATCH_SIZE);
  createMatchFrom(io, entries.map((e) => e.socket));
}

function forceMatch(io: SocketIOServer, socketId: string): void {
  const entries = Array.from(queue.values());
  if (!entries.length) return;
  // group everyone currently queued (1..QUICK_MATCH_SIZE); AI fills the rest
  createMatchFrom(io, entries.slice(0, QUICK_MATCH_SIZE).map((e) => e.socket));
  void socketId;
}

function createMatchFrom(io: SocketIOServer, sockets: Socket[]): void {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId, players: new Map(), state: null,
    hostId: "", createdAt: Date.now(), started: false, loop: null,
  };
  sockets.forEach((s, i) => {
    const q = queue.get(s.id);
    if (!q) return;
    queue.delete(s.id);
    if (i === 0) room.hostId = q.info.id;
    room.players.set(q.info.id, {
      ...q.info, ready: true, socketId: s.id, connected: true, dropTimer: null,
    });
    s.join(roomId);
    s.data.roomId = roomId;
    s.data.playerId = q.info.id;
  });
  if (room.players.size === 0) return;
  rooms.set(roomId, room);
  io.to(roomId).emit("matchFound", roomId, publicPlayers(room));
  // short suspense then start
  setTimeout(() => startGame(io, roomId), 2500);
}

/* ── game loop (server-authoritative) ── */
function startGame(io: SocketIOServer, roomId: string): void {
  const room = rooms.get(roomId);
  if (!room || room.started) return;
  room.started = true;

  const state = createGameState();
  state.gamePhase = "playing";
  state.gameStartTime = Date.now();
  state.__inputs = new Map<string, PlayerInput>();

  for (const [id, p] of room.players) {
    state.players.set(id, createPlayer(id, p.name, p.characterId, false));
  }
  // fill with AI up to a lively minimum
  const target = Math.max(QUICK_MATCH_SIZE, room.players.size);
  const numAI = Math.max(0, target - room.players.size);
  const used = new Set(Array.from(room.players.values()).map((p) => p.characterId));
  const avail = CHARACTERS.filter((c) => !used.has(c.id));
  for (let i = 0; i < numAI; i++) {
    const cd = avail[i % avail.length] ?? CHARACTERS[i % CHARACTERS.length];
    state.players.set(`ai-${i}`, createPlayer(`ai-${i}`, `${cd.name} (AI)`, cd.id, true));
  }

  spawnMonCrystals(state, 20);
  room.state = state;
  io.to(roomId).emit("gameStart", publicPlayers(room));

  let lastEvent = Date.now();
  room.loop = setInterval(() => {
    if (!room.state || (room.state.gamePhase as string) === "ended") {
      if (room.loop) clearInterval(room.loop);
      room.loop = null;
      if (room.state?.winner) io.to(roomId).emit("gameEnded", room.state.winner);
      room.started = false;
      // reset ready flags for a rematch
      for (const p of room.players.values()) p.ready = false;
      return;
    }
    const now = Date.now();
    updateGame(room.state, 33, now, room.state.__inputs ?? new Map());
    if (now - lastEvent > 20000 + Math.random() * 10000) {
      triggerRandomEvent(room.state, now);
      lastEvent = now;
    }
    io.to(roomId).emit("gameState", serializeState(room.state));
  }, 50);
}

interface SerializedGameState {
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

function serializeState(state: GameState): SerializedGameState {
  return {
    players: Array.from(state.players.values()).map((p) => ({
      id: p.id, name: p.name, characterId: p.characterId,
      x: p.pos.x, y: p.pos.y, vx: p.vel.x, vy: p.vel.y,
      health: p.health, maxHealth: p.maxHealth, energy: p.energy, mon: p.mon,
      alive: p.alive, facing: p.facing, isAI: p.isAI, radius: p.radius,
    })),
    monCrystals: state.monCrystals.map((c) => ({
      id: c.id, x: c.pos.x, y: c.pos.y, value: c.value, radius: c.radius,
    })),
    timeRemaining: state.timeRemaining,
    gamePhase: state.gamePhase,
    winner: state.winner,
    eventAnnouncement: state.eventAnnouncement,
  };
}

export { rooms, type Room };
