"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import WalletButton from "@/components/wallet-button";
import { ethers } from "ethers";

const ABI = [
  "function mint(address to) payable",
  "function mintPrice() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function pointsOf(uint256 tokenId) view returns (uint256)",
];

export default function NFTPage() {
  const w = useWallet();
  const [tokens, setTokens] = useState<any[]>([]);
  const [minting, setMinting] = useState(false);
  const [mintPrice, setMintPrice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_ADDRESS || "";

  useEffect(() => {
    if (!w.address || !w.onMonad || !NFT_ADDRESS) return;
    const load = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(w.provider ?? (window as any).ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(NFT_ADDRESS, ABI, signer);
        const priceBn = await contract.mintPrice();
        setMintPrice(ethers.utils.formatUnits(priceBn.toString(), 18));

        const balance = await contract.balanceOf(w.address);
        const n = balance.toNumber ? balance.toNumber() : Number(balance);
        const out: any[] = [];
        for (let i = 0; i < n; i++) {
          const id = await contract.tokenOfOwnerByIndex(w.address, i);
          const tid = id.toNumber ? id.toNumber() : Number(id);
          const uri = await contract.tokenURI(tid);
          const points = await contract.pointsOf(tid);
          const json = parseDataUrlJson(uri);
          out.push({ id: tid, uri, meta: json, points: points.toString ? points.toString() : String(points) });
        }
        setTokens(out);
      } catch (err: any) {
        setError(String(err?.message ?? err));
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.address, w.onMonad, w.provider, NFT_ADDRESS]);

  function parseDataUrlJson(dataUrl: string) {
    try {
      if (dataUrl.startsWith("data:application/json;base64,")) {
        const b = dataUrl.replace("data:application/json;base64,", "");
        const s = atob(b);
        return JSON.parse(s);
      }
      return null;
    } catch {
      return null;
    }
  }

  async function handleMint() {
    setError(null);
    if (!w.address) { setError("Connect wallet"); return; }
    if (!w.onMonad) { setError("Switch to Monad network"); return; }
    if (!NFT_ADDRESS) { setError("NFT contract not configured"); return; }
    if (!w.provider && typeof window === "undefined") { setError("Wallet provider unavailable"); return; }
    setMinting(true);
    try {
      const provider = new ethers.providers.Web3Provider(w.provider ?? (window as any).ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(NFT_ADDRESS, ABI, signer);
      const price = await contract.mintPrice();
      const tx = await contract.mint(w.address, { value: price });
      await tx.wait();
      setTokens([]);
      setTimeout(() => { void window.location.reload(); }, 800);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally { setMinting(false); }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <a href="/dashboard" className="inline-block text-sm text-purple-300 hover:underline">← Back</a>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black neon-text">MY NFTS</h1>
          <div><WalletButton /></div>
        </div>

        <div className="neon-card p-4 mb-4">
          <p className="text-sm text-purple-200/60">Mint a randomized Sperm NFT. Each NFT grants gameplay power points.</p>
          <div className="mt-3 flex gap-3">
            <button onClick={handleMint} disabled={minting || !w.address}
              className="glow-btn glow-btn-gold px-6 py-3 disabled:opacity-50">
              {minting ? 'MINTING…' : `MINT ${mintPrice ? `· ${mintPrice} MON` : ''}`}
            </button>
            <button onClick={() => { setError(null); setTokens([]); void window.location.reload(); }}
              className="px-4 py-3 rounded-xl border text-sm">Refresh</button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tokens.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ border: '1px dashed rgba(139,92,246,.25)' }}>
              <p className="text-sm text-purple-400/60">No NFTs found. Mint one to get started.</p>
            </div>
          )}
          {tokens.map((t) => (
            <div key={t.id} className="rounded-2xl p-3" style={{ border: '1px solid rgba(139,92,246,.12)', background: 'rgba(10,3,20,.6)' }}>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="col-span-1">
                  {t.meta?.image ? (
                    <img src={t.meta.image} alt={`sperm-${t.id}`} className="rounded-xl w-full" />
                  ) : (
                    <div className="w-full h-24 bg-[#0b0210] rounded-xl" />
                  )}
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black">Sperm #{t.id}</p>
                      <p className="text-xs text-purple-300/60">{t.meta?.attributes?.find?.((a: any) => a.trait_type === 'Rarity')?.value}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-yellow-300 font-bold">{t.points} pts</p>
                      <p className="text-xs text-purple-400/60">Owned</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-purple-300/50 mt-2 line-clamp-3">{t.meta?.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
