import re

content = open("src/lib/use-multiplayer.ts", "r").read()

old_block = """  const ensureConnected = useCallback(() => {
    const s = socketRef.current ?? getSocket();
    socketRef.current = s;
    bind(s);
    if (!s.connected) {
      setConn("connecting");
      connectSocket();
      // if nothing happens in a few seconds, mark unavailable
      setTimeout(() => {
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
      if (s) s.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);"""

new_block = """  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/use-multiplayer.ts", "w").write(content)
    print("Patched ensureConnected in use-multiplayer.ts")
else:
    print("Could not find ensureConnected block in use-multiplayer.ts")
