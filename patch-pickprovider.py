import re

content = open("src/lib/wallet-core.ts", "r").read()

old_block = """  const match = (p: Eip1193Provider) => {
    switch (id) {
      case "metamask": return !!p.isMetaMask && !p.isRainbow && !p.isTrust;
      case "phantom": return !!p.isPhantom;
      case "coinbase": return !!p.isCoinbaseWallet;
      case "trust": return !!p.isTrust;
      case "rainbow": return !!p.isRainbow;
      default: return true;
    }
  };"""

new_block = """  const match = (p: Eip1193Provider) => {
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
  };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/lib/wallet-core.ts", "w").write(content)
    print("Patched pickProvider in wallet-core.ts")
else:
    print("Could not find pickProvider block in wallet-core.ts")

old_block2 = """  const has = (fn: (p: Eip1193Provider) => boolean) => list.some(fn);"""

new_block2 = """  const has = (fn: (p: Eip1193Provider) => boolean) => list.some((p) => {
    try { return fn(p); } catch { return false; }
  });"""

if old_block2 in content:
    content = content.replace(old_block2, new_block2)
    open("src/lib/wallet-core.ts", "w").write(content)
    print("Patched detectWallets in wallet-core.ts")
else:
    print("Could not find detectWallets block in wallet-core.ts")
