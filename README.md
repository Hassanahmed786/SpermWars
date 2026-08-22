# 🧬 Sperm Wars — Monad Edition

A cinematic, wallet-powered multiplayer arcade game built for Monad Testnet. Sperm Wars blends a polished browser experience with real blockchain interactions, a Socket.IO multiplayer backend, match staking, NFT minting, and fast-play game loops designed for hackathon demos and production-style deployment.

## Live project links
- Live frontend: https://spermwars.vercel.app/
- Live multiplayer backend: https://spermwars.onrender.com
- GitHub repo: https://github.com/Hassanahmed786/SpermWars
- Monad explorer: https://testnet.monadexplorer.com
- Game contract: https://testnet.monadexplorer.com/address/0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
- NFT contract: https://testnet.monadexplorer.com/address/0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b

## Deployed contract addresses
- Game contract: `0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43`
- NFT contract: `0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b`

---

## What this app is
Sperm Wars is a multiplayer web3 game prototype with:
- fast arcade gameplay
- realtime room-based multiplayer
- wallet-based MON staking and match pots
- on-chain contract integration for staking and results
- NFT minting with generated token metadata
- ready-made deployment architecture for Vercel + Render

The project is designed to feel like a real product demo while staying practical enough for deployment, testing, and iteration.

---

## Why it stands out
This project combines several layers that are often kept separate:
- polished game UI built with Next.js and TypeScript
- real EVM wallet support for MetaMask / Phantom style injected wallets
- Monad chain switching and balance checks
- multiplayer room coordination through Socket.IO
- match pot mechanics with MON staking
- on-chain NFT minting with per-token power metadata
- deployment plan that separates frontend and persistent backend

It is meant to showcase a real-world game product flow: connect wallet, join room, stake MON, start match, and claim or settle rewards.

---

## Feature overview

### 1. Arcade gameplay
The app includes two playable loops:

#### Chaos Arena
- competitive survival arena gameplay
- top-down movement and obstacle avoidance
- hazard zones and random world events
- fast reactive action for small multiplayer matches

#### Sperm Dash
- side-scrolling style endless runner mechanics
- hazard dodging and power-up collection
- score seeking and combo-style progression
- reward-focused gameplay loop with a strong arcade feel

### 2. Multiplayer room system
- room creation and join flow
- room code generation and shareable links
- ready-state toggling before match start
- host-controlled start flow
- live room updates through Socket.IO
- per-player lobby metadata and wallet tags

### 3. Wallet integration
- MetaMask and injected wallet compatibility
- network detection and Monad switching
- balance reads
- send MON transactions
- wallet signature confirmations for staking actions

### 4. MON staking and match pot flow
The app includes a match pot system where players can stake MON before starting a match.

Core logic:
- a room generates a match ID
- the room stake is turned into a contract call to `stakeMatch(bytes32)`
- the pot is tracked on-chain in the Sperm Wars match contract
- settlement logic can distribute the pot to a winner or split it equally in tie scenarios

The app uses a hashed game ID to convert the room code into a valid 32-byte `bytes32` value, which is required by Solidity.

### 5. NFT minting
The NFT flow is built as a proof-of-concept for blockchain utility items:
- randomized token traits
- rarity and power-point assignment
- on-chain SVG metadata generation
- mint flow tied to the connected wallet
- separate NFT contract from the gameplay contract

### 6. Browser + backend architecture
The project is split between:
- a Next.js frontend deployed to Vercel
- a custom Node + Socket.IO backend deployed to Render

This split is necessary because persistent multiplayer sockets do not behave like regular static frontend deployments.

---

## App architecture

### Frontend
- Next.js 16
- React 19
- TypeScript
- App Router architecture
- custom game and lobby components
- wallet provider abstraction

### Backend
- Node.js runtime
- custom `server.ts` launcher
- Socket.IO event server
- room lifecycle management
- real-time lobby updates and match coordination

### Smart contracts
- Solidity 0.8.20
- Hardhat deployment pipeline
- On-chain logic for game result recording and staking
- ERC-721 NFT contract

### Web3 stack
- ethers
- viem
- injected wallet support
- Monad Testnet RPC and explorer configuration

---

## Contract summary

### SpermWarsMonad
Main match and reward contract.

Responsibilities:
- register players
- store match data
- track staking pots
- settle winner / tie payouts
- allow reward claims

Key functions:
- `registerPlayer(string _username)`
- `recordGameResult(bytes32 _gameId, address _winner, uint8 _playersCount)`
- `stakeMatch(bytes32 _gameId)` payable
- `settleMatchPot(bytes32 _gameId, address[] calldata _participants, address _winner)`
- `claimReward(bytes32 _gameId)`

### SpermNFT
NFT minting contract.

Responsibilities:
- mint randomized NFTs
- assign metadata traits
- generate on-chain SVG content
- expose token power metadata

Key functions:
- `mint(address to)`
- `ownerMint(address to, uint256 points)`
- `pointsOf(uint256 tokenId)`
- `tokenURI(uint256 tokenId)`

---

## Project structure

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
│   ├── lib/
│   └── ...
├── server.ts
├── hardhat.config.js
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── .env
├── .gitignore
└── ...
```

---

## Local setup

### Install dependencies
```bash
npm install
```

### Run the multiplayer server locally
```bash
npx tsx server.ts
```

The app will serve from:
- http://localhost:3000

### Production style local run
```bash
$env:NODE_ENV='production'; $env:PORT='3000'; npx tsx server.ts
```

---

## Required environment values

```env
NEXT_PUBLIC_MONAD_NETWORK=testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAINID=10143

NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
NEXT_PUBLIC_NFT_ADDRESS=0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b
NEXT_PUBLIC_NFT_MINT_PRICE=0
NEXT_PUBLIC_MON_SINK=0x000000000000000000000000000000000000dEaD
NEXT_PUBLIC_BLAST_COST=0.001

DEPLOYER_KEY=YOUR_PRIVATE_KEY
CONTRACT_OWNER_KEY=YOUR_PRIVATE_KEY

PORT=3000
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://spermwars.onrender.com
```

### Security note
- Never expose private keys in frontend code or public repos.
- Keep deployment secrets on the server side only.
- Use environment variables for all wallet and contract secrets.

---

## Hardhat deployment

### Deploy the main contract
```bash
npx hardhat run scripts/deploy.js --network monad
```

### Deploy the NFT contract
```bash
npx hardhat run scripts/deploy-nft.js --network monad
```

### Update the app config after deployment
Once deployed, update the following env values with the new addresses:
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_NFT_ADDRESS`

---

## Frontend deployment (Vercel)

1. Push the project to GitHub.
2. Open Vercel.
3. Import the repository.
4. Use the default Next.js project settings.
5. Add the frontend env variables.
6. Deploy the project.

### Vercel env example
```env
NEXT_PUBLIC_MONAD_NETWORK=testnet
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_EXPLORER=https://testnet.monadexplorer.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
NEXT_PUBLIC_NFT_ADDRESS=0x2B0d0bC803C5EC7c6fd9AaE163696228EC4f2c2b
NEXT_PUBLIC_NFT_MINT_PRICE=0
NEXT_PUBLIC_MON_SINK=0x000000000000000000000000000000000000dEaD
NEXT_PUBLIC_BLAST_COST=0.001
NEXT_PUBLIC_BACKEND_URL=https://spermwars.onrender.com
```

---

## Multiplayer backend deployment (Render)

1. Create a new Render Web Service.
2. Connect the GitHub repo.
3. Set the build command:
```bash
npm install; npm run build
```
4. Set the start command:
```bash
npm run start
```
5. Add server environment variables:
```env
PORT=3000
NODE_ENV=production
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAINID=10143
NEXT_PUBLIC_CONTRACT_ADDRESS=0x8646813ef56cEDAc8D2e5bCe05B26cD17729Fb43
CONTRACT_OWNER_KEY=YOUR_PRIVATE_KEY
```
6. Deploy and copy the live Render URL.
7. Put the Render URL into `NEXT_PUBLIC_BACKEND_URL` on Vercel.

---

## Example production flow

1. User visits the Vercel app.
2. User connects wallet on Monad Testnet.
3. User creates or joins a room.
4. User stakes MON into the match pot.
5. Room host starts the match.
6. Players ready up and compete.
7. Winner settlement is processed through the contract logic.
8. NFT minting can be used separately for collectible progression.

---

## Deployment architecture summary

### Recommended final architecture
- Frontend: Vercel
- Backend: Render
- Wallets: MetaMask / injected EVM wallets
- Chain: Monad Testnet
- Smart contracts: Hardhat-managed

This architecture ensures the app can remain user-friendly while still supporting real blockchain and realtime multiplayer interactions.

---

## Troubleshooting

### WebSocket connection fails
- Check that the backend is listening on the deployed Render service
- Confirm the start command is `npm run start`
- Confirm `NEXT_PUBLIC_BACKEND_URL` is set to the live Render URL
- Confirm the backend CORS allowlist includes the Vercel domain

### Smart contract call reverts
- Ensure wallet is on Monad Testnet
- Confirm the contract address is correct
- Confirm the function you are calling exists in the deployed contract
- Check whether the room ID is hashed correctly before sending as `bytes32`

### Build fails on Render
- Make sure `tsx` is included in dependencies
- Use `npm install; npm run build` as the build command
- Keep `npm run start` as the runtime command for the custom server

---

## Product positioning and hackathon value

Sperm Wars is positioned as an on-chain game prototype that demonstrates:
- strong UX and visual design
- practical blockchain usage
- live multiplayer infrastructure
- game product thinking beyond static NFT demos
- an end-to-end app stack ready for a full demo or startup pitch

This app is not only a game; it is a blueprint for a multiplayer web3 arcade product.

---

## License
MIT

---

## Final note
This README is intended to serve as a judge-facing reference, deployment guide, and technical handoff document for the project.

The app is live at:
- Frontend: https://spermwars.vercel.app/
- Backend: https://spermwars.onrender.com

The repo is available here:
- https://github.com/Hassanahmed786/SpermWars
