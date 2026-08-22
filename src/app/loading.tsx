export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #1a0036 0%, #0f0020 40%, #080012 70%, #030008 100%)" }}>
      <div className="text-center space-y-5">
        <div className="text-5xl font-black tracking-wider title-glow"
          style={{ color: "#c4b5fd", textShadow: "0 0 40px rgba(139,92,246,0.8), 0 0 80px rgba(139,92,246,0.4)" }}>
          SPERM WARS
        </div>
        <p className="text-sm text-purple-400 tracking-[0.4em] font-bold">MONAD EDITION</p>
        <div className="space-y-2">
          <p className="text-purple-300/60 text-xs tracking-widest animate-pulse">INITIALIZING THE SWIM...</p>
          <div className="w-48 h-1 bg-purple-900/30 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full shimmer" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
