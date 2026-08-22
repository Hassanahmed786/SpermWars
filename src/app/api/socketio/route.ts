import { NextResponse } from "next/server";

// Socket.IO is handled by the custom server when running in standalone mode
// This route exists as a fallback - the actual Socket.IO server is started
// via the custom server.ts file when running `npm run start`

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Socket.IO server is available when running with the custom server",
    note: "Use 'npm run start' with server.ts for full multiplayer support",
  });
}

export async function POST() {
  return NextResponse.json({ status: "ok" });
}
