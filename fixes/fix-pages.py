import glob

def clean_file(path):
    content = open(path, "r").read()
    
    # Simple replacement for one-liners
    content = content.replace("<WalletProvider><LeaderboardInner /></WalletProvider>", "<LeaderboardInner />")
    content = content.replace("<WalletProvider><DashboardContent /></WalletProvider>", "<DashboardContent />")
    content = content.replace("<WalletProvider><ProfileContent /></WalletProvider>", "<ProfileContent />")
    content = content.replace("<WalletProvider><CharactersContent /></WalletProvider>", "<CharactersContent />")
    
    # Multi-line
    content = content.replace("<WalletProvider>\n      <DashPage />\n    </WalletProvider>", "<DashPage />")
    content = content.replace("<WalletProvider>\n      <ArenaPage />\n    </WalletProvider>", "<ArenaPage />")
    content = content.replace("<WalletProvider>\n      <LobbyContent />\n    </WalletProvider>", "<LobbyContent />")
    content = content.replace("<WalletProvider>\n      <PlayContent />\n    </WalletProvider>", "<PlayContent />")
    content = content.replace("<WalletProvider>\n      <Suspense fallback={<div className=\"fixed inset-0 bg-[#0a0014] grid place-items-center text-purple-300 animate-pulse\">Loading multiplayer…</div>}>\n        <MultiplayerInner />\n      </Suspense>\n    </WalletProvider>", "<Suspense fallback={<div className=\"fixed inset-0 bg-[#0a0014] grid place-items-center text-purple-300 animate-pulse\">Loading multiplayer…</div>}>\n        <MultiplayerInner />\n      </Suspense>")
    
    # Cleanup imports
    content = content.replace('import { WalletProvider, useWallet } from "@/components/wallet-provider";', 'import { useWallet } from "@/components/wallet-provider";')
    content = content.replace('import { WalletProvider } from "@/components/wallet-provider";\n', '')
    
    open(path, "w").write(content)

for file in glob.glob("src/app/**/*.tsx", recursive=True):
    clean_file(file)

print("Cleaned pages")
