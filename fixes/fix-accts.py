import re

content = open("src/components/wallet-provider.tsx", "r").read()

old_block = """      onAccounts: (accts) => {
        if (!accts.length) {"""

new_block = """      onAccounts: (accts) => {
        if (!accts || !accts.length) {"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/components/wallet-provider.tsx", "w").write(content)
    print("Patched onAccounts in wallet-provider.tsx")
else:
    print("Could not find onAccounts in wallet-provider.tsx")
