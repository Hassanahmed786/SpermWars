# 🧬 Sperm Wars — Monad Edition

A fast, arcade-style multiplayer game built for the Monad ecosystem. The project combines a polished web game, real on-chain wallet interaction, NFT minting, and a live multiplayer lobby backed by Socket.IO. It is designed to be presentation-ready for a hackathon, strong enough for local demos, and structured for real deployment to Vercel + a persistent Node backend.

## Live status
- Frontend app: Next.js 16 + TypeScript + App Router
- Backend: custom Socket.IO server via `server.ts`
- Smart contracts: Solidity + Hardhat
- Wallet: MetaMask / Phantom / injected EVM wallets
- Testnet: Monad Testnet
- Current deployed contracts:
  - Game contract: `0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43`
  - NFT contract: `0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b`

---

## Why this project matters
Sperm Wars is not just a mini-game. It demonstrates the full stack of a modern on-chain game idea:
- real wallet connectivity on Monad
- user-chosen staking and match coordination
- NFT minting with randomized traits and power points
- server-backed multiplayer rooms
- on-chain contract hooks for game results and payouts

The project is built to show that a browser game can feel polished while still being genuinely connected to blockchain logic and a persistent multiplayer backend.

---

## Core product overview

### Games included
1. Chaos Arena
   - Top-down 8-player survival mode
   - Competitive movement and hazard avoidance
   - World events and performance boosts
   - Built for quick match-based gameplay

2. Sperm Dash
   - Endless runner / survival-style platform challenge
   - Hazard dodging and power-up collection
   - Score + multiplier system
   - Designed as a second fast-play arcade loop

### Multiplayer features
- room-based matchmaking and lobby
- ready-state syncing
- room code sharing
- live room updates with Socket.IO
- match staking for MON via the wallet
- pot-based play and winner settlement flow prepared for on-chain settlement

### Blockchain features
- wallet connection and chain switching for Monad
- on-chain staking into match pots via `stakeMatch`
- NFT minting via `SpermNFT`
- randomized token metadata and power-point logic
- contract-ready reward and settlement integration for the game loop

---

## File structure

```text
.
├── contracts/
│   ├── SpermNFT.sol
│   └── SpermWarsMonad.sol
├── scripts/
│   ├── deploy.js
│   └── deploy-nft.js
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   └── lib/
├── server.ts
├── hardhat.config.js
├── package.json
├── .env.example
├── .env
├── README.md
├── test/
│   └── staking.spec.js
└── next.config.ts
```

---

## Tech stack

### Frontend
- Next.js 16
- TypeScript
- React 19
- Tailwind/PostCSS
- App Router

### Backend
- Node.js
- Socket.IO
- custom server at `server.ts`

### Contracts
- Solidity 0.8.20
- Hardhat
- OpenZeppelin contracts

### Wallet / Web3
- EIP-1193 injection detection
- MetaMask and Phantom compatibility
- ethers v5
- viem

---

## Smart contracts

### 1) `SpermWarsMonad.sol`
This contract is the main game contract.

Responsibilities:
- player registration
- game recordings
- reward payout logic
- match staking
- match pot management
- settlement logic for winner or tie payouts

Key functions:
- `registerPlayer(string _username)`
- `recordGameResult(bytes32 _gameId, address _winner, uint8 _playersCount)`
- `stakeMatch(bytes32 _gameId)` payable
- `settleMatchPot(bytes32 _gameId, address[] calldata _participants, address _winner)`
- `claimReward(bytes32 _gameId)`

Important note:
- This is implemented for a real game flow and is designed to integrate directly with a persistent backend / game service.
- The contract uses MON in settlement and staking logic on Monad Testnet.

### 2) `SpermNFT.sol`
This contract supplies randomized NFTs with on-chain metadata and utility points.

What it does:
- mints ERC-721 NFTs
- assigns random rarity, color, and pattern traits
- assigns power points to each token
- generates SVG-based metadata in a fully on-chain way
- supports mint price management and withdrawals

Key functions:
- `mint(address to)` payable
- `ownerMint(address to, uint256 points)`
- `pointsOf(uint256 tokenId)`
- `tokenURI(uint256 tokenId)`

---

## Deployment architecture

This project is built for a split deployment model because live multiplayer needs a persistent Node server.

### Recommended production setup
- Frontend: Vercel
- Multiplayer backend: Render or a similar persistent Node host
- Blockchain: Monad Testnet

This is the safest deployment architecture for a Socket.IO-based game app.

### Why not pure Vercel only?
Vercel is ideal for the frontend, but WebSockets and long-lived multiplayer sessions are not reliable on a serverless-only configuration. The app includes a custom Socket.IO server at `server.ts`, so a persistent backend is required for multiplayer rooms to remain live.

---

## Environment variables

Use the local `.env` file as your base config. The project includes a local `.env` already set for the project environment.

### Required values

```env
# Monad network
NEXT_PUBLIC_MONAD_NETWORK=testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAINID=10143

# Contract deployment + on-chain app usage
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
NEXT_PUBLIC_NFT_ADDRESS=0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b
NEXT_PUBLIC_NFT_MINT_PRICE=0
NEXT_PUBLIC_MON_SINK=0x000000000000000000000000000000000000dEaD
NEXT_PUBLIC_BLAST_COST=0.001

# Deployment keys (server-side only)
DEPLOYER_KEY=YOUR_PRIVATE_KEY
CONTRACT_OWNER_KEY=YOUR_PRIVATE_KEY

# Backend
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=
```

### Important security note
- Keep private keys server-side only.
- Never expose the deployer key in a frontend build.
- Never commit production secret values to public GitHub repositories.

---

## Local development

### Install dependencies
```bash
npm install
```

### Run the app locally
```bash
npx tsx server.ts
```

This starts the custom Socket.IO server and serves the app at:
- http://localhost:3000

### Production mode
```bash
$env:NODE_ENV='production'; $env:PORT='3000'; npx tsx server.ts
```

---

## Build and verification

The project was validated with a production Next.js build.

```bash
npm run build
```

Verified results:
- Next.js build succeeded
- TypeScript compile succeeded
- all routes were generated
- app is ready for deployment build pipelines

---

## Hardhat deployment steps

### Deploy the main game contract
```bash
npx hardhat run scripts/deploy.js --network monad
```

### Deploy the NFT contract
```bash
npx hardhat run scripts/deploy-nft.js --network monad
```

### Contract addresses used in this project
- Game contract: `0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43`
- NFT contract: `0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b`

---

## Vercel deployment steps

1. Push the repo to GitHub.
2. Go to Vercel.
3. Import the repo.
4. Use default Next.js build settings.
5. Add environment variables listed above.
6. Deploy.

### Frontend envs for Vercel
```env
NEXT_PUBLIC_MONAD_NETWORK=testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
NEXT_PUBLIC_NFT_ADDRESS=0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b
NEXT_PUBLIC_NFT_MINT_PRICE=0
NEXT_PUBLIC_MON_SINK=0x000000000000000000000000000000000000dEaD
NEXT_PUBLIC_BLAST_COST=0.001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_BACKEND_URL=https://YOUR_RENDER_URL
```

---

## Render deployment steps for multiplayer backend

1. Sign in to Render.
2. Create a new Web Service.
3. Connect the GitHub repo.
4. Set the build command:
```bash
npm install
```
5. Set the start command:
```bash
npx tsx server.ts
```
6. Add environment variables:
```env
PORT=3000
NODE_ENV=production
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAINID=10143
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
CONTRACT_OWNER_KEY=YOUR_PRIVATE_KEY
```
7. Copy the Render URL and put it into `NEXT_PUBLIC_BACKEND_URL` on Vercel.
8. Redeploy the frontend.

---

## Multiplayer logic summary

The multiplayer flow is powered by:
- Socket.IO event-driven rooms
- room creation and joining
- player readiness tracking
- host controlled start events
- state synchronization for match start and result handling

This allows the app to keep rooms stable while the actual game loop remains accessible via a browser-friendly multiplayer interface.

---

## Staking and match pot logic

The contract includes MON staking for match pot mechanics.

### Flow
- players stake MON into a room-specific match pot
- a room or match gets a unique game ID
- winner settlement can distribute the entire pot to one winner
- in tie situations the contract can split the pot evenly between participants

This setup is designed to show a production-style match-sharing mechanic that a game publisher could extend for tournaments and event-based payouts.

---

## NFT minting description

The NFT page lets a connected wallet mint a randomized Sperm NFT.

Each token includes:
- rarity
- color palette slot
- pattern type
- power points

The NFT metadata is generated on-chain and stored as base64 data URIs, so no external metadata server is required.

---

## Product positioning

This project sits at the intersection of:
- arcade game design
- real blockchain onboarding
- wallet-first user interaction
- multiplayer session management
- on-chain reward and staking logic

It was designed to feel like a game prototype that is credible enough for a hackathon or early demo, but also complete enough to serve as a foundation for a real product roadmap.

---

## Hackathon judge summary

Sperm Wars demonstrates:
- end-to-end product vision
- functional blockchain integration
- UX quality and game polish
- multiplayer architecture thinking
- deployment readiness and production awareness
- ability to bundle real web3 mechanics into an interactive game experience

---

## License
MIT

---

## Contact / next steps
For production use, the project should be configured with:
- a funded Monad wallet for deployment and gas
- a secure backend private key for server-side contract interactions
- a live Render or hosted backend for multiplayer networking
- a Vercel frontend for the browser experience

This README is intended to serve as the primary reference document for judges, deployment managers, and future maintainers.
