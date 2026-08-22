// Monad Contract ABI and configuration
// This provides the interface for interacting with the SpermWarsMonad contract

export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz";
export const MONAD_TESTNET_EXPLORER = "https://testnet.monadexplorer.com";

// Contract address - set after deployment
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000";

export function makeMatchGameId(roomId: string): `0x${string}` {
  const { keccak256, toHex, isHex } = require("viem");
  const value = (roomId || "").trim();
  if (!value) throw new Error("Room ID is required for a match game ID");
  if (isHex(value) && value.length === 66) return value as `0x${string}`;
  const hashed = keccak256(toHex(value)) as string;
  return hashed as `0x${string}`;
}

// Simplified ABI for the SpermWarsMonad contract
export const SPERM_WARS_ABI = [
  {
    inputs: [{ name: "_username", type: "string" }],
    name: "registerPlayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_gameId", type: "bytes32" }],
    name: "stakeMatch",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "_gameId", type: "bytes32" },
      { name: "_winner", type: "address" },
      { name: "_playersCount", type: "uint8" },
    ],
    name: "recordGameResult",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_gameId", type: "bytes32" },
      { name: "_participants", type: "address[]" },
      { name: "_winner", type: "address" },
    ],
    name: "settleMatchPot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_gameId", type: "bytes32" }],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalGames",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_player", type: "address" }],
    name: "getPlayerStats",
    outputs: [
      { name: "username", type: "string" },
      { name: "totalWins", type: "uint256" },
      { name: "totalGames", type: "uint256" },
      { name: "totalMonEarned", type: "uint256" },
      { name: "bestStreak", type: "uint256" },
      { name: "registered", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "baseReward",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "gameId", type: "bytes32" },
      { indexed: false, name: "winner", type: "address" },
      { indexed: false, name: "playersCount", type: "uint256" },
      { indexed: false, name: "reward", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "GameCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "RewardClaimed",
    type: "event",
  },
] as const;

// Helper to generate a game ID
export function generateGameId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Monad chain config for wagmi
export const monadChain = {
  id: MONAD_TESTNET_CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [MONAD_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: MONAD_TESTNET_EXPLORER },
  },
} as const;
