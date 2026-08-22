import re

content = open("src/lib/wallet-core.ts", "r").read()

old_block = """  // Some wallets inject into their own namespaces alongside window.ethereum
  if (w.phantom && w.phantom.ethereum) providers.add(w.phantom.ethereum);
  if (w.coinbaseWalletExtension) providers.add(w.coinbaseWalletExtension);
  if (w.trustwallet) providers.add(w.trustwallet);

  return Array.from(providers);"""

new_block = """  // Some wallets inject into their own namespaces alongside window.ethereum
  try { if (w.phantom && w.phantom.ethereum) providers.add(w.phantom.ethereum); } catch (e) {}
  try { if (w.coinbaseWalletExtension) providers.add(w.coinbaseWalletExtension); } catch (e) {}
  try { if (w.trustwallet) providers.add(w.trustwallet); } catch (e) {}

  return Array.from(providers);"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/wallet-core.ts", "w").write(content)
    print("Patched allInjected in wallet-core.ts")
else:
    print("Could not find allInjected in wallet-core.ts")
