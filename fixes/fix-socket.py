import re

content = open("src/lib/socket-client.ts", "r").read()

old_block = """export function getSocket(): Socket {
  if (!socket) {
    socket = io({
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
}"""

new_block = """export function getSocket(): Socket {
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
}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/socket-client.ts", "w").write(content)
    print("Patched socket-client.ts")
else:
    print("Could not find getSocket block in socket-client.ts")

