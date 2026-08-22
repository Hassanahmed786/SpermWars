"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getSocket, connectSocket, getPlayerId, getPlayerName,
  type MpPlayer, type JoinInfo, type SerializedGameState,
} from "./socket-client";
import type { Socket } from "socket.io-client";

export type MpConnState = "idle" | "connecting" | "connected" | "reconnecting" | "unavailable" | "disconnected";
export type MpScreen = "hub" | "matchmaking" | "room" | "match" | "found";

export interface MultiplayerApi {
  conn: MpConnState;
  online: number | null;         // null = unknown (never fabricated)
  screen: MpScreen;
  roomId: string | null;
  players: MpPlayer[];
  isHost: boolean;
  playerId: string;
  playerName: string;
  matchmakingText: string;
  gameState: SerializedGameState | null;
  winner: string | null;
  error: string | null;

  ensureConnected: () => void;
  quickMatch: (characterId: string, wallet?: string | null) => void;
  cancelQuickMatch: () => void;
  createRoom: (characterId: string, wallet?: string | null) => void;
  joinRoom: (code: string, characterId: string, wallet?: string | null) => void;
  toggleReady: (ready: boolean) => void;
  selectCharacter: (characterId: string) => void;
  startGame: () => void;
  leave: () => void;
  sendInput: (input: unknown) => void;
  setScreen: (s: MpScreen) => void;
  clearError: () => void;
}

const MM_LINES = [
  "SEARCHING FOR OPPONENTS...",
  "FINDING THE FASTEST SPERM...",
  "THE EGG IS WAITING...",
  "ALMOST THERE...",
];

export function useMultiplayer(): MultiplayerApi {
  const [conn, setConn] = useState<MpConnState>("idle");
  const [online, setOnline] = useState<number | null>(null);
  const [screen, setScreen] = useState<MpScreen>("hub");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<MpPlayer[]>([]);
  const [gameState, setGameState] = useState<SerializedGameState | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mmText, setMmText] = useState(MM_LINES[0]);

  const socketRef = useRef<Socket | null>(null);
  const playerId = useRef(getPlayerId());
  const playerName = useRef(getPlayerName());
  const characterRef = useRef<string>("space");
  const walletRef = useRef<string | null>(null);
  const mmTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isHost = players.find((p) => p.id === playerId.current)?.isHost ?? false;

  /* cycle matchmaking flavour text */
  useEffect(() => {
    if (screen !== "matchmaking") {
      if (mmTimer.current) { clearInterval(mmTimer.current); mmTimer.current = null; }
      return;
    }
    let i = 0;
    mmTimer.current = setInterval(() => {
      i = (i + 1) % MM_LINES.length;
      setMmText(MM_LINES[i]);
    }, 1800);
    return () => { if (mmTimer.current) clearInterval(mmTimer.current); };
  }, [screen]);

  const bind = useCallback((s: Socket) => {
    s.removeAllListeners();
    s.io.off("reconnect_attempt");
    s.io.off("reconnect");
    s.io.off("reconnect_failed");

    s.on("connect", () => {
      setConn("connected");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });
    s.io.on("reconnect_attempt", () => setConn("reconnecting"));
    s.io.on("reconnect", () => {
      setConn("connected");
      // auto rejoin room if we were in one
      if (roomId) {
        s.emit("joinRoom", roomId, joinInfo());
      }
    });
    s.io.on("reconnect_failed", () => setConn("unavailable"));
    s.on("disconnect", () => setConn((c) => (c === "connected" ? "reconnecting" : c)));
    s.on("connect_error", () => {
      // if we never connected at all, the server isn't reachable
      setConn((c) => (c === "connecting" ? "unavailable" : c));
    });

    s.on("onlineCount", (n: number) => setOnline(typeof n === "number" ? n : null));

    s.on("roomCreated", (id: string, list: MpPlayer[]) => {
      setRoomId(id); setPlayers(list); setScreen("room");
    });
    s.on("roomJoined", (id: string, list: MpPlayer[]) => {
      setRoomId(id); setPlayers(list); setScreen("room");
    });
    s.on("roomUpdated", (list: MpPlayer[]) => setPlayers(list));
    s.on("mpError", (_code: string, msg: string) => setError(msg));

    s.on("matchmaking", (status: string) => {
      if (status === "SEARCHING") setScreen("matchmaking");
      if (status === "CANCELLED") setScreen("hub");
    });
    s.on("matchFound", (id: string, list: MpPlayer[]) => {
      setRoomId(id); setPlayers(list); setScreen("found");
    });
    s.on("gameStart", (list: MpPlayer[]) => { setPlayers(list); setWinner(null); setScreen("match"); });
    s.on("gameState", (gs: SerializedGameState) => setGameState(gs));
    s.on("gameEnded", (w: string) => setWinner(w));
  }, [roomId]);

  const joinInfo = useCallback((): JoinInfo => ({
    id: playerId.current,
    name: playerName.current,
    characterId: characterRef.current,
    wallet: walletRef.current,
  }), []);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureConnected = useCallback(() => {
    const s = socketRef.current ?? getSocket();
    socketRef.current = s;
    bind(s);
    if (!s.connected) {
      setConn("connecting");
      connectSocket();
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!s.connected) setConn((c) => (c === "connecting" ? "unavailable" : c));
      }, 6500);
    } else {
      setConn("connected");
      s.emit("getOnline");
    }
  }, [bind]);

  useEffect(() => {
    ensureConnected();
    return () => {
      const s = socketRef.current;
      if (s) {
        s.off("connect");
        s.off("disconnect");
        s.off("connect_error");
        s.off("onlineCount");
        s.off("roomCreated");
        s.off("roomJoined");
        s.off("roomUpdated");
        s.off("mpError");
        s.off("matchmaking");
        s.off("matchFound");
        s.off("gameStart");
        s.off("gameState");
        s.off("gameEnded");
        s.io.off("reconnect_attempt");
        s.io.off("reconnect");
        s.io.off("reconnect_failed");
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickMatch = useCallback((characterId: string, wallet?: string | null) => {
    characterRef.current = characterId; walletRef.current = wallet ?? null;
    const s = socketRef.current;
    if (!s?.connected) { setError("Multiplayer server not reachable"); return; }
    setScreen("matchmaking");
    s.emit("quickMatch", joinInfo());
  }, [joinInfo]);

  const cancelQuickMatch = useCallback(() => {
    socketRef.current?.emit("cancelQuickMatch");
    setScreen("hub");
  }, []);

  const createRoom = useCallback((characterId: string, wallet?: string | null) => {
    characterRef.current = characterId; walletRef.current = wallet ?? null;
    const s = socketRef.current;
    if (!s?.connected) { setError("Multiplayer server not reachable"); return; }
    s.emit("createRoom", joinInfo());
  }, [joinInfo]);

  const joinRoom = useCallback((code: string, characterId: string, wallet?: string | null) => {
    characterRef.current = characterId; walletRef.current = wallet ?? null;
    const s = socketRef.current;
    if (!s?.connected) { setError("Multiplayer server not reachable"); return; }
    s.emit("joinRoom", code.toUpperCase(), joinInfo());
  }, [joinInfo]);

  const toggleReady = useCallback((ready: boolean) => {
    if (roomId) socketRef.current?.emit("ready", roomId, playerId.current, ready);
  }, [roomId]);

  const selectCharacter = useCallback((characterId: string) => {
    characterRef.current = characterId;
    if (roomId) socketRef.current?.emit("selectCharacter", roomId, playerId.current, characterId);
  }, [roomId]);

  const startGame = useCallback(() => {
    if (roomId) socketRef.current?.emit("startGame", roomId, playerId.current);
  }, [roomId]);

  const leave = useCallback(() => {
    if (roomId) socketRef.current?.emit("leaveRoom", roomId);
    setRoomId(null); setPlayers([]); setGameState(null); setWinner(null); setScreen("hub");
  }, [roomId]);

  const sendInput = useCallback((input: unknown) => {
    if (roomId) socketRef.current?.emit("playerInput", roomId, playerId.current, input);
  }, [roomId]);

  return {
    conn, online, screen, roomId, players, isHost,
    playerId: playerId.current, playerName: playerName.current,
    matchmakingText: mmText, gameState, winner, error,
    ensureConnected, quickMatch, cancelQuickMatch, createRoom, joinRoom,
    toggleReady, selectCharacter, startGame, leave, sendInput,
    setScreen, clearError: () => setError(null),
  };
}
