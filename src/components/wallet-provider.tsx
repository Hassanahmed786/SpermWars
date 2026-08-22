"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  connectWallet, switchToMonad, getBalance, isOnMonad, subscribe,
  sendTransaction, waitForReceipt, monToWeiHex, WalletError,
  type Connection, type WalletId, type Eip1193Provider, type TxRequest,
} from "@/lib/wallet-core";
import { MONAD, shortAddress as fmtShort, txExplorerUrl, addressExplorerUrl } from "@/lib/monad-chain";
import { useToast } from "./toast";
import { audio } from "@/lib/audio";
import WalletModal from "./wallet-modal";
import { CONTRACT_ADDRESS, SPERM_WARS_ABI, makeMatchGameId } from "@/lib/monad-contract";
import { encodeFunctionData } from "viem";

export type ConnStatus = "disconnected" | "connecting" | "connected" | "demo";

export interface SendResult {
  ok: boolean;
  hash?: string;
  error?: string;
}

interface WalletContextType {
  /* ── preserved original API (do not change signatures) ── */
  address: string | null;
  balance: string;
  isConnected: boolean;
  isDemoMode: boolean;
  connect: () => Promise<void>;      // opens the modal
  disconnect: () => void;
  shortAddress: string | null;
  provider: Eip1193Provider | null;

  /* ── new capabilities ── */
  status: ConnStatus;
  walletId: WalletId | null;
  chainIdHex: string | null;
  onMonad: boolean;
  networkName: string;
  explorer: string;
  openModal: () => void;
  closeModal: () => void;
  modalOpen: boolean;
  connectWith: (id: WalletId) => Promise<void>;
  connectDemo: () => void;
  switchNetwork: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  copyAddress: () => void;
  addressExplorerUrl: () => string | null;
  /** Real MON transfer used to power Monad Blast etc. Returns confirmed hash. */
  sendMon: (to: string, amount: number, label?: string) => Promise<SendResult>;
  /** Stake MON into the room pot for a match. */
  stakeMon: (gameId: string, amount: number, label?: string) => Promise<SendResult>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

/** Kept for backwards-compat with earlier imports. */
export const MONAD_CHAIN_ID = MONAD.chainId;
export const MONAD_RPC = MONAD.rpcUrl;
export const MONAD_EXPLORER = MONAD.explorer;

/** Community "burn/sink" address for MON-powered actions when no contract is set. */
const MON_SINK = process.env.NEXT_PUBLIC_MON_SINK || "0x000000000000000000000000000000000000dEaD";

export function WalletProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [conn, setConn] = useState<Connection | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [status, setStatus] = useState<ConnStatus>("disconnected");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAddress, setDemoAddress] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const unsubRef = useRef<null | (() => void)>(null);

  const address = conn?.address ?? demoAddress ?? null;
  const chainIdHex = conn?.chainIdHex ?? null;
  const onMonad = chainIdHex ? isOnMonad(chainIdHex) : false;

  const refreshBalance = useCallback(async () => {
    if (!conn) return;
    try {
      const b = await getBalance(conn.provider, conn.address);
      setBalance(b);
    } catch {
      // don't spam toasts on background refresh
    }
  }, [conn]);

  /* subscribe to account/chain changes */
  useEffect(() => {
    if (!conn) return;
    unsubRef.current?.();
    unsubRef.current = subscribe(conn.provider, {
      onAccounts: (accts) => {
        if (!accts || !accts.length) {
          setConn(null); setStatus("disconnected"); setBalance("0");
          toast.push({ kind: "warning", title: "Wallet disconnected", duration: 4000 });
        } else if (accts[0] !== conn.address) {
          setConn({ ...conn, address: accts[0] });
          toast.push({ kind: "info", title: "Account switched", message: fmtShort(accts[0]) ?? "", duration: 3500 });
        }
      },
      onChain: (cid) => {
        setConn((c) => (c ? { ...c, chainIdHex: cid } : c));
        if (isOnMonad(cid)) {
          toast.push({ kind: "success", title: `On ${MONAD.name}`, duration: 3000 });
        } else {
          toast.push({ kind: "warning", title: "Wrong network", message: "Switch to Monad to play with MON", duration: 5000 });
        }
      },
      onDisconnect: () => { setConn(null); setStatus("disconnected"); setBalance("0"); },
    });
    return () => unsubRef.current?.();
  }, [conn, toast]);

  /* refresh balance when connection or chain changes */
  // Syncs balance FROM the chain (an external system) into React state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refreshBalance(); }, [refreshBalance, chainIdHex]);

  const connectWith = useCallback(async (id: WalletId) => {
    setStatus("connecting");
    const pending = toast.push({ kind: "pending", title: "Connecting wallet…", message: "Approve in your wallet", duration: 0 });
    try {
      const c = await connectWallet(id);
      setConn(c);
      setDemoAddress(null);
      setIsDemoMode(false);
      setStatus("connected");
      setModalOpen(false);
      audio.play("powerup");
      toast.update(pending, {
        kind: "success",
        title: "Wallet connected",
        message: fmtShort(c.address) ?? "",
        duration: 3500,
      });

      // nudge onto Monad if needed
      if (!isOnMonad(c.chainIdHex)) {
        toast.push({
          kind: "warning",
          title: "Switch to Monad",
          message: `This game runs on ${MONAD.name}`,
          duration: 6000,
        });
      }
    } catch (err) {
      setStatus("disconnected");
      const we = err instanceof WalletError ? err : new WalletError("unknown", "Connection failed");
      toast.update(pending, {
        kind: we.kind === "no_provider" ? "warning" : "error",
        title: we.kind === "no_provider" ? "Wallet not detected" : we.kind === "rejected" ? "Connection rejected" : "Connection failed",
        message: we.kind === "no_provider" ? "Install the wallet or pick another option" : we.message,
        duration: 5000,
      });
      throw we;
    }
  }, [toast]);

  const connectDemo = useCallback(() => {
    const demo = "0xDE" + Array.from({ length: 38 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
    setDemoAddress(demo);
    setConn(null);
    setIsDemoMode(true);
    setStatus("demo");
    setBalance("10.000");
    setModalOpen(false);
    audio.play("click");
    toast.push({
      kind: "info",
      title: "Demo mode",
      message: "No real transactions will be made",
      duration: 4000,
    });
  }, [toast]);

  const switchNetwork = useCallback(async () => {
    if (!conn) return;
    const pending = toast.push({ kind: "pending", title: "Switching to Monad…", duration: 0 });
    try {
      await switchToMonad(conn.provider);
      // chainChanged handler will fire; also refresh proactively
      const cid = (await conn.provider.request({ method: "eth_chainId" })) as string;
      setConn({ ...conn, chainIdHex: cid });
      toast.update(pending, { kind: "success", title: `Switched to ${MONAD.name}`, duration: 3000 });
      void refreshBalance();
    } catch (err) {
      const we = err instanceof WalletError ? err : new WalletError("unknown", "Switch failed");
      toast.update(pending, {
        kind: we.kind === "rejected" ? "warning" : "error",
        title: we.kind === "rejected" ? "Switch cancelled" : "Could not switch network",
        message: we.message,
        duration: 5000,
      });
    }
  }, [conn, toast, refreshBalance]);

  const disconnect = useCallback(() => {
    unsubRef.current?.();
    setConn(null);
    setDemoAddress(null);
    setBalance("0");
    setStatus("disconnected");
    setIsDemoMode(false);
    toast.push({ kind: "info", title: "Disconnected", duration: 2500 });
  }, [toast]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard?.writeText(address).then(
      () => toast.push({ kind: "success", title: "Address copied", duration: 2000 }),
      () => toast.push({ kind: "error", title: "Copy failed", duration: 2500 })
    );
  }, [address, toast]);

  const sendMon = useCallback(async (to: string, amount: number, label = "Transaction"): Promise<SendResult> => {
    // DEMO MODE: be explicit, never fake a hash.
    if (isDemoMode || !conn) {
      toast.push({
        kind: "warning",
        title: "Demo mode — no transaction sent",
        message: "Connect a real wallet on Monad to spend MON",
        duration: 4500,
      });
      return { ok: false, error: "demo" };
    }
    if (!isOnMonad(conn.chainIdHex)) {
      const pending = toast.push({ kind: "pending", title: "Switching to Monad…", message: "Approve the network change in your wallet", duration: 0 });
      try {
        await switchToMonad(conn.provider);
        const cid = (await conn.provider.request({ method: "eth_chainId" })) as string;
        setConn((c) => (c ? { ...c, chainIdHex: cid } : c));
        toast.update(pending, { kind: "success", title: "Switched to Monad", duration: 3000 });
      } catch (err) {
        const we = err instanceof WalletError ? err : new WalletError("unknown", "Could not switch network");
        toast.update(pending, {
          kind: we.kind === "rejected" ? "warning" : "error",
          title: we.kind === "rejected" ? "Network switch rejected" : "Could not switch to Monad",
          message: we.message,
          duration: 5000,
        });
        return { ok: false, error: "wrong_network" };
      }
    }
    // pre-check balance
    const balNum = parseFloat(balance);
    if (!isNaN(balNum) && balNum < amount) {
      toast.push({ kind: "error", title: "Insufficient MON", message: `Need ${amount} MON`, duration: 4000 });
      return { ok: false, error: "insufficient" };
    }

    const req: TxRequest = { to, value: monToWeiHex(amount) };
    const pending = toast.push({ kind: "pending", title: `${label} pending…`, message: "Confirm in your wallet", duration: 0 });
    try {
      const hash = await sendTransaction(conn.provider, conn.address, req);
      toast.update(pending, {
        kind: "pending",
        title: "Transaction submitted",
        message: "Waiting for confirmation…",
        href: txExplorerUrl(hash),
        hrefLabel: "View on Monad Explorer",
        duration: 0,
      });
      const receipt = await waitForReceipt(conn.provider, hash);
      if (receipt.status === "success") {
        audio.play("victory");
        toast.update(pending, {
          kind: "success",
          title: "Transaction confirmed ✓",
          message: `Block #${receipt.blockNumber}`,
          href: txExplorerUrl(hash),
          hrefLabel: "View on Monad Explorer",
          duration: 7000,
        });
        void refreshBalance();
        return { ok: true, hash };
      }
      toast.update(pending, {
        kind: "error", title: "Transaction reverted",
        href: txExplorerUrl(hash), hrefLabel: "View on Monad Explorer", duration: 6000,
      });
      return { ok: false, hash, error: "reverted" };
    } catch (err) {
      const we = err instanceof WalletError ? err : new WalletError("unknown", "Transaction failed");
      toast.update(pending, {
        kind: we.kind === "rejected" ? "warning" : "error",
        title: we.kind === "rejected" ? "Transaction rejected"
             : we.kind === "insufficient" ? "Insufficient MON"
             : "Transaction failed",
        message: we.message,
        duration: 5500,
      });
      return { ok: false, error: we.kind };
    }
  }, [isDemoMode, conn, balance, toast, refreshBalance]);

  const stakeMon = useCallback(async (gameId: string, amount: number, label = "Match stake"): Promise<SendResult> => {
    if (isDemoMode || !conn) {
      toast.push({ kind: "warning", title: "Demo mode — no transaction sent", message: "Connect a real wallet on Monad to stake MON", duration: 4500 });
      return { ok: false, error: "demo" };
    }
    if (!isOnMonad(conn.chainIdHex)) {
      const pending = toast.push({ kind: "pending", title: "Switching to Monad…", message: "Approve the network change in your wallet", duration: 0 });
      try {
        await switchToMonad(conn.provider);
        const cid = (await conn.provider.request({ method: "eth_chainId" })) as string;
        setConn((c) => (c ? { ...c, chainIdHex: cid } : c));
        toast.update(pending, { kind: "success", title: "Switched to Monad", duration: 3000 });
      } catch (err) {
        const we = err instanceof WalletError ? err : new WalletError("unknown", "Could not switch network");
        toast.update(pending, {
          kind: we.kind === "rejected" ? "warning" : "error",
          title: we.kind === "rejected" ? "Network switch rejected" : "Could not switch to Monad",
          message: we.message,
          duration: 5000,
        });
        return { ok: false, error: "wrong_network" };
      }
    }
    const balNum = parseFloat(balance);
    if (!isNaN(balNum) && balNum < amount) {
      toast.push({ kind: "error", title: "Insufficient MON", message: `Need ${amount} MON`, duration: 4000 });
      return { ok: false, error: "insufficient" };
    }

    const normalizedGameId = makeMatchGameId(gameId);
    const data = encodeFunctionData({
      abi: SPERM_WARS_ABI,
      functionName: "stakeMatch",
      args: [normalizedGameId],
    });

    const pending = toast.push({ kind: "pending", title: `${label} pending…`, message: "Confirm in your wallet", duration: 0 });
    try {
      const hash = await sendTransaction(conn.provider, conn.address, { to: CONTRACT_ADDRESS, value: monToWeiHex(amount), data });
      toast.update(pending, {
        kind: "pending",
        title: "Stake submitted",
        message: "Waiting for confirmation…",
        href: txExplorerUrl(hash),
        hrefLabel: "View on Monad Explorer",
        duration: 0,
      });
      const receipt = await waitForReceipt(conn.provider, hash);
      if (receipt.status === "success") {
        audio.play("victory");
        toast.update(pending, {
          kind: "success",
          title: "Stake confirmed ✓",
          message: `Pot started with ${amount} MON`,
          href: txExplorerUrl(hash),
          hrefLabel: "View on Monad Explorer",
          duration: 7000,
        });
        void refreshBalance();
        return { ok: true, hash };
      }
      toast.update(pending, { kind: "error", title: "Stake failed", href: txExplorerUrl(hash), hrefLabel: "View on Monad Explorer", duration: 6000 });
      return { ok: false, hash, error: "reverted" };
    } catch (err) {
      const we = err instanceof WalletError ? err : new WalletError("unknown", "Stake failed");
      toast.update(pending, {
        kind: we.kind === "rejected" ? "warning" : "error",
        title: we.kind === "rejected" ? "Stake rejected" : "Stake failed",
        message: we.message,
        duration: 5500,
      });
      return { ok: false, error: we.kind };
    }
  }, [isDemoMode, conn, balance, toast, refreshBalance]);

  const value: WalletContextType = {
    address,
    balance,
    isConnected: !!address,
    isDemoMode,
    connect: async () => setModalOpen(true),
    disconnect,
    shortAddress: fmtShort(address),
    provider: conn?.provider ?? null,

    status,
    walletId: conn?.walletId ?? (isDemoMode ? "demo" : null),
    chainIdHex,
    onMonad,
    networkName: MONAD.name,
    explorer: MONAD.explorer,
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    modalOpen,
    connectWith,
    connectDemo,
    switchNetwork,
    refreshBalance,
    copyAddress,
    addressExplorerUrl: () => (address ? addressExplorerUrl(address) : null),
    sendMon: (to, amount, label) => sendMon(to, amount, label),
    stakeMon,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletModal />
    </WalletContext.Provider>
  );
}

export { MON_SINK };
