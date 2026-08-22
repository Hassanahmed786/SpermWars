"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CharacterSelect from "@/components/character-select";
import { setProfileCharacter, loadProfile } from "@/lib/profile";

function CharactersContent() {
  const router = useRouter();
  const [sel, setSel] = useState(() => (typeof window !== "undefined" ? loadProfile().character : "space"));
  const [saved, setSaved] = useState(false);

  return (
    <div className="relative">
      <CharacterSelect
        selected={sel}
        onSelect={(id) => { setSel(id); setSaved(false); }}
        onConfirm={() => { setProfileCharacter(sel); setSaved(true); setTimeout(() => router.push("/play"), 700); }}
        onBack={() => router.push("/play")}
        title="🧬 CHARACTERS"
        subtitle="Six swimmers. Six abilities. Pick your main."
        confirmLabel={saved ? "✓ SAVED" : "★ SET AS MAIN"}
      />
      <Link href="/play"
        className="absolute top-4 left-4 text-xs text-purple-400/70 hover:text-purple-300 tracking-widest z-10">
        ← BACK
      </Link>
    </div>
  );
}

export default function Page() {
  return <CharactersContent />;
}
