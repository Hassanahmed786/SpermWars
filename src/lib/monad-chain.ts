/**
 * Canonical Monad network configuration.
 *
 * Values verified against the official Monad developer documentation:
 *   - Mainnet: chain id 143  (0x8f),   RPC https://rpc.monad.xyz
 *   - Testnet: chain id 10143 (0x279f), RPC https://testnet-rpc.monad.xyz
 *
 * The app defaults to TESTNET. Override with NEXT_PUBLIC_MONAD_NETWORK=mainnet.
 */

export interface MonadNetwork {
  key: "testnet" | "mainnet";
  chainId: number;
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorer: string;
  currency: { name: string; symbol: string; decimals: number };
}

const TESTNET: MonadNetwork = {
  key: "testnet",
  chainId: 10143,
  chainIdHex: "0x279f",
  name: "Monad Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
  explorer: process.env.NEXT_PUBLIC_MONAD_EXPLORER || "https://testnet.monadexplorer.com",
  currency: { name: "Monad", symbol: "MON", decimals: 18 },
};

const MAINNET: MonadNetwork = {
  key: "mainnet",
  chainId: 143,
  chainIdHex: "0x8f",
  name: "Monad",
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://rpc.monad.xyz",
  explorer: process.env.NEXT_PUBLIC_MONAD_EXPLORER || "https://monadexplorer.com",
  currency: { name: "Monad", symbol: "MON", decimals: 18 },
};

export const MONAD: MonadNetwork =
  process.env.NEXT_PUBLIC_MONAD_NETWORK === "mainnet" ? MAINNET : TESTNET;

export const MONAD_TESTNET = TESTNET;
export const MONAD_MAINNET = MAINNET;

/** Both hex ids so we can recognise "already on Monad" regardless of env. */
export const MONAD_CHAIN_HEXES = new Set([TESTNET.chainIdHex, MAINNET.chainIdHex]);

export function isMonadChain(chainIdHex: any): boolean {
  if (!chainIdHex) return false;
  const hex = typeof chainIdHex === "number" ? "0x" + chainIdHex.toString(16) : String(chainIdHex);
  return hex.toLowerCase() === MONAD.chainIdHex;
}

export function txExplorerUrl(hash: string): string {
  return `${MONAD.explorer}/tx/${hash}`;
}

export function addressExplorerUrl(addr: string): string {
  return `${MONAD.explorer}/address/${addr}`;
}

/** Format a wei-hex or bigint balance to a friendly MON string. */
export function formatMon(weiHexOrBigint: string | bigint, decimals = 3): string {
  let wei: bigint;
  try {
    wei = typeof weiHexOrBigint === "bigint" ? weiHexOrBigint : BigInt(weiHexOrBigint);
  } catch {
    return "0";
  }
  const base = 10n ** 18n;
  const whole = wei / base;
  const frac = wei % base;
  const fracStr = (frac * 10n ** BigInt(decimals) / base).toString().padStart(decimals, "0");
  const trimmed = fracStr.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : `${whole}`;
}

export function shortAddress(addr: string | null): string | null {
  if (!addr) return null;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
