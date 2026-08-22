import re

content = open("src/lib/wallet-core.ts", "r").read()

old_block = """function getInjected(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: Eip1193Provider; phantom?: { ethereum?: Eip1193Provider } };
  return w.ethereum ?? w.phantom?.ethereum ?? null;
}

/** Return every distinct injected provider (EIP-5749 style `providers` array). */
function allInjected(): Eip1193Provider[] {
  const root = getInjected();
  if (!root) return [];
  if (Array.isArray(root.providers) && root.providers.length) return root.providers;
  return [root];
}"""

new_block = """/** Return every distinct injected provider (EIP-5749 style `providers` array, plus specific namespaces). */
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
  if (w.phantom && w.phantom.ethereum) providers.add(w.phantom.ethereum);
  if (w.coinbaseWalletExtension) providers.add(w.coinbaseWalletExtension);
  if (w.trustwallet) providers.add(w.trustwallet);

  return Array.from(providers);
}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/wallet-core.ts", "w").write(content)
    print("Successfully patched wallet-core.ts")
else:
    print("Could not find the block to replace!")

