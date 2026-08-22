import re

content = open("src/lib/wallet-core.ts", "r").read()

old_block = """export function isOnMonad(chainIdHex: string): boolean {
  return chainIdHex.toLowerCase() === MONAD.chainIdHex ||
    MONAD_CHAIN_HEXES.has(chainIdHex.toLowerCase());
}"""

new_block = """export function isOnMonad(chainIdHex: any): boolean {
  if (!chainIdHex) return false;
  const hex = typeof chainIdHex === "number" ? "0x" + chainIdHex.toString(16) : String(chainIdHex);
  return hex.toLowerCase() === MONAD.chainIdHex ||
    MONAD_CHAIN_HEXES.has(hex.toLowerCase());
}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/wallet-core.ts", "w").write(content)
    print("Patched isOnMonad in wallet-core.ts")
else:
    print("Could not find isOnMonad in wallet-core.ts")

content2 = open("src/lib/monad-chain.ts", "r").read()
old_block2 = """export function isMonadChain(chainIdHex: string | null): boolean {
  if (!chainIdHex) return false;
  return chainIdHex.toLowerCase() === MONAD.chainIdHex;
}"""

new_block2 = """export function isMonadChain(chainIdHex: any): boolean {
  if (!chainIdHex) return false;
  const hex = typeof chainIdHex === "number" ? "0x" + chainIdHex.toString(16) : String(chainIdHex);
  return hex.toLowerCase() === MONAD.chainIdHex;
}"""

if old_block2 in content2:
    content2 = content2.replace(old_block2, new_block2)
    open("src/lib/monad-chain.ts", "w").write(content2)
    print("Patched isMonadChain in monad-chain.ts")
else:
    print("Could not find isMonadChain in monad-chain.ts")

