import re

content = open("src/lib/use-multiplayer.ts", "r").read()

old_block = """  const bind = useCallback((s: Socket) => {
    s.removeAllListeners();

    s.on("connect", () => setConn("connected"));"""

new_block = """  const bind = useCallback((s: Socket) => {
    s.removeAllListeners();
    s.io.off("reconnect_attempt");
    s.io.off("reconnect");
    s.io.off("reconnect_failed");

    s.on("connect", () => {
      setConn("connected");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/use-multiplayer.ts", "w").write(content)
    print("Patched bind in use-multiplayer.ts")
else:
    print("Could not find bind block in use-multiplayer.ts")
