import re

content = open("src/components/root-providers.tsx", "r").read()
content = content.replace('import { WalletProvider } from "./wallet-provider";\n"use client";', '"use client";\n\nimport { WalletProvider } from "./wallet-provider";')
open("src/components/root-providers.tsx", "w").write(content)
print("Fixed import order")
