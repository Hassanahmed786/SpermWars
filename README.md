# 🧬 SPERM WARS — MONAD EDITION

> **8 Sperm. 1 Egg. Infinite Chaos.**
> A polished, cinematic, two-game arcade platform built natively for Monad.

![Monad](https://img.shields.io/badge/Monad-Testnet-8b5cf6?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-000?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge)

---

## 🌟 Stability & Web3 Production Patch (v1.0.1)

This final release focuses entirely on architectural stability, Web3 provider resilience, and deployment readiness.

### 🛠️ What We Fixed
- **Phantom Wallet Crash (Resolved)**: Phantom uses strict proxy wrappers for its EIP-1193 injection (`window.phantom.ethereum`). We safely sandboxed provider iteration in `try...catch` blocks to prevent properties like `.isPhantom` from throwing exceptions when multiple extensions conflict for the `window.ethereum` namespace.
- **Chain ID Hex Crash (Resolved)**: Certain wallet implementations return the Chain ID as an integer (e.g., `10143`) instead of standard hex format (`0x279f`). The application now safely normalizes all incoming `eth_chainId` values before performing network evaluations, preventing `.toLowerCase()` string parsing crashes.
- **Infinite Wallet Disconnects (Resolved)**: The `WalletProvider` was previously instantiated inside individual page components, meaning Next.js client-side navigation would unmount the provider, wipe the connection state, and force a reconnect on every page. `WalletProvider` is now a true global React singleton mounted in `RootProviders`, persisting your connection safely across the entire app.
- **Empty `accountsChanged` Crash (Resolved)**: Safely guarded against empty payloads emitting from wallets during initialization.
- **Multiplayer 'Connecting' Hang (Resolved)**: Hardened the `useMultiplayer` React hook. React 18 StrictMode unmounts were stripping the internal Socket.IO `connect_error` events and stacking duplicate `reconnect_attempt` listeners on the engine. The socket is now gracefully cleaned up, ensuring fallback to VS AI mode works when the backend is unreachable. Added `NEXT_PUBLIC_BACKEND_URL` for decoupled deployments.

---

## 🎮 Two Complete Games

### 🧬 GAME 1 — CHAOS ARENA
Top-down survival brawl for up to **8 players**.
- Dash into rivals, knock them into hazards, collect MON energy, trigger mutations.
- **World events**: Immune Attack, Fluid Surge, Mutation Storm, Monad Surge, Gravity Flip.
- **Parallel events**: All players choose simultaneously, resolved in one step.
- **Monad Blast**: Spend 0.001 MON (real on-chain transaction) to unleash a devastating radial shockwave.

### 🥚 GAME 2 — SPERM DASH
Original side-scrolling endless swimmer. Race **1000m** to the egg.
- **8 hazard types**: Immune cells, DNA barriers, fragments, vortexes, electric fences, bubble traps, toxic zones, moving cells.
- **5 power-ups**: Turbo, Shield, Mutation, MON Magnet, Rocket Tail.
- **4 boss events**: Immune Cell Chase, DNA Tunnel, Monad Surge, The Final Swim.
- **Combo system**: Chain MON pickups for escalating score multipliers.

---

## 🚀 Quick Start

### 1. Install & Build
```bash
npm install
cp .env.example .env
npm run build
```

### 2. Configure Environment Variables
You MUST configure your `.env` file before deploying.
```env
# ── Monad network ──
NEXT_PUBLIC_MONAD_NETWORK=testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com

# ── Smart Contract ──
# Address of the deployed SpermWarsMonad contract
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_MON_SINK=0x000000000000000000000000000000000000dEaD
NEXT_PUBLIC_BLAST_COST=0.001

# ── Server (Socket + owner key) ──
PORT=3000
NODE_ENV=production
# Owner private key for server-side on-chain writes (server-side ONLY)
CONTRACT_OWNER_KEY=

# (Optional) If deploying Backend separately from Frontend, point to the Socket URL
NEXT_PUBLIC_BACKEND_URL=
```

### 4. Running the Real-Time Multiplayer Server
To enable live multiplayer (Socket.IO), you MUST use the custom server script. Do NOT use `next start` for production multiplayer.
```bash
npx tsx server.ts
```
*(If the custom server isn't running, the game gracefully degrades and lets you play against AI bots).*

---

## ⛓️ Smart Contract Deployment

To record winners on-chain and distribute MON rewards, deploy the included contract to the Monad Testnet.

1. **Install Foundry**: `curl -L https://foundry.paradigm.xyz | bash`
2. **Export Deployer Key**: `export DEPLOYER_KEY=0xYourPrivateKey`
3. **Deploy**:
```bash
forge create contracts/SpermWarsMonad.sol:SpermWarsMonad \
  --rpc-url https://testnet-rpc.monad.xyz \
  --constructor-args 0 1000000000000000 \
  --private-key $DEPLOYER_KEY
```
4. Copy the `Deployed to:` address and paste it as `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env` file.

---

## 🚢 Deployment Guide

### Frontend & API
This project is built on Next.js 16 (App Router). 
If you are deploying to **Vercel**, ensure you map all the `NEXT_PUBLIC_` variables in the Vercel dashboard.

### Real-Time Backend (WebSockets)
Vercel's serverless environment does not support persistent WebSockets. To host the real-time multiplayer server:
1. Deploy the app to a platform like **Railway**, **Render**, or **Fly.io**.
2. Set your start command to: `npx tsx server.ts`
3. Ensure the `PORT` and `DATABASE_URL` environment variables are properly mapped.
4. Ensure your hosting provider supports WebSocket (`ws://` / `wss://`) traffic routing on that port.

---

## 📝 Required from Developer for Hackathon Submission

If you are taking this over for the final demo, you need to provide:

- [ ] A funded Monad Testnet wallet to pay deployment gas.
- [ ] Your deployed `NEXT_PUBLIC_CONTRACT_ADDRESS`.
- [ ] A live PostgreSQL database URL (e.g., Supabase, Neon, RDS).
- [ ] A persistent host (Railway/Render) for `server.ts` to power multiplayer.

## 📜 License
MIT — Built for the Monad Hackathon 🧬💜
