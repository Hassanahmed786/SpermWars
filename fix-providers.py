import re

content = open("src/components/root-providers.tsx", "r").read()

old_block = """  return (
    <ToastProvider>
      <MemeProvider>{children}</MemeProvider>
    </ToastProvider>
  );"""

new_block = """  return (
    <ToastProvider>
      <MemeProvider>
        <WalletProvider>{children}</WalletProvider>
      </MemeProvider>
    </ToastProvider>
  );"""

if old_block in content:
    content = content.replace(old_block, new_block)
    content = 'import { WalletProvider } from "./wallet-provider";\n' + content
    open("src/components/root-providers.tsx", "w").write(content)
    print("Patched root-providers.tsx")
else:
    print("Could not find block in root-providers.tsx")
