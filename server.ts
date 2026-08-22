// Custom Next.js server with Socket.IO support
// Run with: npx tsx server.ts
// This starts both the Next.js app and the Socket.IO multiplayer server

import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Initialize Socket.IO
  try {
    const { Server: SocketIOServer } = await import("socket.io");
    const { setupGameServer } = await import("./src/lib/game-server");

    const io = new SocketIOServer(server, {
      path: "/api/socketio",
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    setupGameServer(io);
    console.log(`[Socket.IO] Multiplayer server initialized on path /api/socketio`);
  } catch (err) {
    console.warn(`[Socket.IO] Failed to initialize multiplayer server:`, err);
    console.warn(`[Socket.IO] Game will work in solo/demo mode only`);
  }

  server.listen(port, hostname, () => {
    console.log(`[Server] Sperm Wars — Monad Edition running on http://${hostname}:${port}`);
  });
});
