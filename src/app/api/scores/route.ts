import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// Minimal ABI: event + owner function
const ABI = [
  "event GameCompleted(bytes32 indexed gameId, address winner, uint256 playersCount, uint256 reward, uint256 timestamp)",
  "function recordGameResult(bytes32 _gameId, address _winner, uint8 _playersCount) external",
];

const RPC = process.env.NEXT_PUBLIC_MONAD_RPC_URL || process.env.MONAD_RPC_URL || "";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const OWNER_KEY = process.env.CONTRACT_OWNER_KEY || process.env.DEPLOYER_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!CONTRACT_ADDRESS) return NextResponse.json({ ok: false, error: "No contract configured" }, { status: 400 });
    if (!OWNER_KEY) return NextResponse.json({ ok: false, error: "Server owner key not configured" }, { status: 403 });

    const provider = new ethers.providers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(OWNER_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // Game ID: accept provided or derive a deterministic bytes32
    let gid = body?.gameId;
    if (!gid) gid = `${Date.now()}-${Math.random()}`;
    if (!gid.startsWith("0x") || gid.length !== 66) {
      gid = ethers.utils.id(String(gid));
    }

    const winner = ethers.utils.getAddress(body.winner);
    const playersCount = Number(body.playersCount) || 1;

    const tx = await contract.recordGameResult(gid, winner, playersCount);
    await tx.wait();
    return NextResponse.json({ ok: true, tx: tx.hash });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!CONTRACT_ADDRESS) return NextResponse.json({ ok: false, error: "No contract configured" }, { status: 400 });
    const provider = new ethers.providers.JsonRpcProvider(RPC);
    const iface = new ethers.utils.Interface(ABI);

    const logs = await provider.getLogs({ address: CONTRACT_ADDRESS, fromBlock: 0, toBlock: "latest" });
    const games: Array<any> = [];
    for (const log of logs) {
      try {
        const parsed = iface.parseLog(log as any);
        if (parsed && parsed.name === "GameCompleted") {
          const g = parsed.args as any;
          games.push({
            gameId: g.gameId,
            winner: g.winner,
            playersCount: g.playersCount.toNumber ? g.playersCount.toNumber() : Number(g.playersCount),
            reward: g.reward.toString ? g.reward.toString() : String(g.reward),
            timestamp: g.timestamp.toNumber ? g.timestamp.toNumber() : Number(g.timestamp),
          });
        }
      } catch {
        // ignore non-matching logs
      }
    }

    // aggregate wins per address
    const map = new Map<string, { wallet: string; games: number; wins: number; mon: string }>();
    for (const g of games) {
      const w = g.winner.toLowerCase();
      const entry = map.get(w) ?? { wallet: g.winner, games: 0, wins: 0, mon: "0" };
      entry.games += 1;
      entry.wins += 1; // each GameCompleted implies one win for winner
      entry.mon = String(BigInt(entry.mon || "0") + BigInt(g.reward || "0"));
      map.set(w, entry);
    }

    const rows = Array.from(map.values()).sort((a, b) => (Number(b.wins) - Number(a.wins))).slice(0, 50);
    return NextResponse.json({ ok: true, mode: "arena", rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err), rows: [] }, { status: 500 });
  }
}
