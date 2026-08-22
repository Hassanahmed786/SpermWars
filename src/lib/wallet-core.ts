/**
 * WALLET CORE — real EIP-1193 wallet handling for Monad.
 *
 * Design goals:
 *  - NEVER fabricate a balance, address, chain or transaction hash.
 *  - Detect installed injected wallets (MetaMask, Phantom EVM, Coinbase, Trust, Rainbow).
 *  - Full transaction lifecycle with real receipts polled from the RPC.
 *  - A clearly-labelled DEMO wallet that does NOT pretend to be on-chain.
 *
 * This is intentionally dependency-free (no wagmi/appkit build step needed) so it
 * cannot destabilise the existing game. WalletConnect is surfaced as "unavailable
 * unless configured" rather than faked.
 */

import { MONAD, MONAD_CHAIN_HEXES, formatMon } from "./monad-chain";

/* ── EIP-1193 minimal typings ─────────────────────────────────── */
export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  providers?: Eip1193Provider[];
}

export type WalletId = "metamask" | "phantom" | "coinbase" | "trust" | "rainbow" | "walletconnect" | "injected" | "demo";

export interface WalletMeta {
  id: WalletId;
  name: string;
  icon: string;          // emoji fallback icon (no external assets required)
  detect: (p: Eip1193Provider) => boolean;
  installed: boolean;    // filled at runtime
}

/* ── detection ────────────────────────────────────────────────── */
/** Return every distinct injected provider (EIP-5749 style `providers` array, plus specific namespaces). */
function allInjected(): Eip1193Provider[] {
  if (typeof window === "undefined") return [];
  const w = window as any;
  const providers = new Set<Eip1193Provider>();

  if (w.ethereum) {
    if (Array.isArray(w.ethereum.providers)) {
      w.ethereum.providers.forEach((p: Eip1193Provider) => providers.add(p));
    } else {
      providers.add(w.ethereum);
    }
  }

  // Some wallets inject into their own namespaces alongside window.ethereum
  try { if (w.phantom && w.phantom.ethereum) providers.add(w.phantom.ethereum); } catch (e) {}
  try { if (w.coinbaseWalletExtension) providers.add(w.coinbaseWalletExtension); } catch (e) {}
  try { if (w.trustwallet) providers.add(w.trustwallet); } catch (e) {}

  return Array.from(providers);
}

function pickProvider(id: WalletId): Eip1193Provider | null {
  const list = allInjected();
  const match = (p: Eip1193Provider) => {
    try {
      switch (id) {
        case "metamask": return !!p.isMetaMask && !p.isRainbow && !p.isTrust;
        case "phantom": return !!p.isPhantom;
        case "coinbase": return !!p.isCoinbaseWallet;
        case "trust": return !!p.isTrust;
        case "rainbow": return !!p.isRainbow;
        default: return true;
      }
    } catch { return false; }
  };
  return list.find(match) ?? (id === "injected" ? list[0] ?? null : null);
}

export function detectWallets(): WalletMeta[] {
  const list = allInjected();
  const has = (fn: (p: Eip1193Provider) => boolean) => list.some((p) => {
    try { return fn(p); } catch { return false; }
  });

  const metas: WalletMeta[] = [
    { id: "metamask", name: "MetaMask", icon: "🦊", detect: (p) => !!p.isMetaMask, installed: has((p) => !!p.isMetaMask) },
    { id: "phantom", name: "Phantom", icon: "👻", detect: (p) => !!p.isPhantom, installed: has((p) => !!p.isPhantom) },
    { id: "rainbow", name: "Rainbow", icon: "🌈", detect: (p) => !!p.isRainbow, installed: has((p) => !!p.isRainbow) },
    { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", detect: (p) => !!p.isCoinbaseWallet, installed: has((p) => !!p.isCoinbaseWallet) },
    { id: "trust", name: "Trust Wallet", icon: "🛡️", detect: (p) => !!p.isTrust, installed: has((p) => !!p.isTrust) },
  ];
  return metas;
}

/* ── errors ───────────────────────────────────────────────────── */
export type WalletErrorKind =
  | "no_provider" | "rejected" | "wrong_network" | "insufficient"
  | "rpc" | "unavailable" | "unknown";

export class WalletError extends Error {
  kind: WalletErrorKind;
  constructor(kind: WalletErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function classify(err: unknown): WalletError {
  const e = err as { code?: number; message?: string };
  const msg = e?.message || "Something went wrong";
  if (e?.code === 4001 || /reject|denied/i.test(msg)) return new WalletError("rejected", "Request rejected in wallet");
  if (e?.code === 4902) return new WalletError("wrong_network", "Monad network not added");
  if (/insufficient funds/i.test(msg)) return new WalletError("insufficient", "Insufficient MON balance");
  if (/network|rpc|fetch|timeout/i.test(msg)) return new WalletError("rpc", "Network/RPC error");
  return new WalletError("unknown", msg);
}

/* ── connection ───────────────────────────────────────────────── */
export interface Connection {
  provider: Eip1193Provider;
  address: string;
  chainIdHex: string;
  walletId: WalletId;
}

export async function connectWallet(id: WalletId): Promise<Connection> {
  const provider = pickProvider(id);
  if (!provider) throw new WalletError("no_provider", `${id} not detected`);

  let accounts: string[];
  try {
    accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  } catch (err) {
    throw classify(err);
  }
  if (!accounts?.length) throw new WalletError("rejected", "No account authorised");

  let chainIdHex = "0x0";
  try {
    chainIdHex = (await provider.request({ method: "eth_chainId" })) as string;
  } catch { /* keep default */ }

  return { provider, address: accounts[0], chainIdHex, walletId: id };
}

export function isOnMonad(chainIdHex: any): boolean {
  if (!chainIdHex) return false;
  const hex = typeof chainIdHex === "number" ? "0x" + chainIdHex.toString(16) : String(chainIdHex);
  return hex.toLowerCase() === MONAD.chainIdHex ||
    MONAD_CHAIN_HEXES.has(hex.toLowerCase());
}

/** Switch to Monad, adding the chain if the wallet doesn't know it. */
export async function switchToMonad(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD.chainIdHex }],
    });
  } catch (err) {
    const e = err as { code?: number };
    // 4902 = chain not added -> add it, then switch happens automatically
    if (e?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: MONAD.chainIdHex,
            chainName: MONAD.name,
            nativeCurrency: MONAD.currency,
            rpcUrls: [MONAD.rpcUrl],
            blockExplorerUrls: [MONAD.explorer],
          }],
        });
      } catch (addErr) {
        throw classify(addErr);
      }
    } else {
      throw classify(err);
    }
  }
}

/* ── balance ──────────────────────────────────────────────────── */
export async function getBalance(provider: Eip1193Provider, address: string): Promise<string> {
  try {
    const hex = (await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    })) as string;
    return formatMon(hex, 3);
  } catch (err) {
    throw classify(err);
  }
}

/* ── transaction lifecycle ────────────────────────────────────── */
export interface TxRequest {
  to: string;
  /** value in wei as a hex string, e.g. "0x38d7ea4c68000" for 0.001 */
  value?: string;
  data?: string;
}

export interface TxResult {
  hash: string;
  status: "success" | "reverted";
  blockNumber: number;
}

/** Convert a decimal MON amount to a wei hex string (no float error). */
export function monToWeiHex(amount: number): string {
  // amount is small (e.g. 0.001). Use string math to avoid FP drift.
  const [whole, frac = ""] = amount.toString().split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fracPadded || "0");
  return "0x" + wei.toString(16);
}

export async function sendTransaction(
  provider: Eip1193Provider,
  from: string,
  req: TxRequest
): Promise<string> {
  try {
    const hash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: req.to, value: req.value ?? "0x0", data: req.data ?? "0x" }],
    })) as string;
    return hash;
  } catch (err) {
    throw classify(err);
  }
}

/** Poll for a real receipt. Never resolves "success" without one. */
export async function waitForReceipt(
  provider: Eip1193Provider,
  hash: string,
  timeoutMs = 60_000
): Promise<TxResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let receipt: { status?: string; blockNumber?: string } | null = null;
    try {
      receipt = (await provider.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      })) as { status?: string; blockNumber?: string } | null;
    } catch {
      // transient RPC hiccup — keep polling
    }
    if (receipt && receipt.blockNumber) {
      return {
        hash,
        status: receipt.status === "0x1" ? "success" : "reverted",
        blockNumber: parseInt(receipt.blockNumber, 16),
      };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new WalletError("rpc", "Timed out waiting for confirmation");
}

/* ── event subscriptions (account/chain changes) ──────────────── */
export function subscribe(
  provider: Eip1193Provider,
  handlers: { onAccounts?: (a: string[]) => void; onChain?: (c: string) => void; onDisconnect?: () => void }
): () => void {
  const acc = (...a: unknown[]) => handlers.onAccounts?.(a[0] as string[]);
  const chn = (...a: unknown[]) => handlers.onChain?.(a[0] as string);
  const dis = () => handlers.onDisconnect?.();
  provider.on?.("accountsChanged", acc);
  provider.on?.("chainChanged", chn);
  provider.on?.("disconnect", dis);
  return () => {
    provider.removeListener?.("accountsChanged", acc);
    provider.removeListener?.("chainChanged", chn);
    provider.removeListener?.("disconnect", dis);
  };
}
