/**
 * AUDIO — 100% procedural WebAudio. No external asset files needed.
 * Provides SFX + layered background music that changes per scene.
 */

export type Sfx =
  | "click" | "hover" | "countdown" | "go"
  | "swim" | "jump" | "boost" | "dash"
  | "hit" | "explode" | "blast" | "monadBlast"
  | "coin" | "combo" | "mutate" | "powerup"
  | "eliminate" | "victory" | "defeat" | "warning";

export type MusicScene = "menu" | "arena" | "dash" | "boss" | "egg" | null;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private scene: MusicScene = null;
  private step = 0;

  muted = false;
  sfxVolume = 0.5;
  musicVolume = 0.28;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVolume;
      this.sfxBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVolume;
      this.musicBus.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.sfxBus) this.sfxBus.gain.value = v;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicBus) this.musicBus.gain.value = v;
  }

  /* ── low level helpers ─────────────────────────────────────── */
  private tone(
    freq: number, dur: number, type: OscillatorType, gain: number,
    bus: GainNode | null, sweepTo?: number, delay = 0
  ): void {
    if (!this.ctx || !bus) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(0.02, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, filterFreq: number, bus: GainNode | null, delay = 0): void {
    if (!this.ctx || !bus) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(filterFreq, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.25), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(bus);
    src.start(t0);
  }

  /* ── SFX ───────────────────────────────────────────────────── */
  play(s: Sfx): void {
    if (!this.ctx) this.init();
    if (!this.ctx || this.muted) return;
    const B = this.sfxBus;
    switch (s) {
      case "click":      this.tone(660, 0.07, "square", 0.16, B, 880); break;
      case "hover":      this.tone(520, 0.04, "sine", 0.07, B, 640); break;
      case "countdown":  this.tone(440, 0.14, "square", 0.2, B); break;
      case "go":
        this.tone(660, 0.1, "square", 0.24, B);
        this.tone(990, 0.22, "square", 0.2, B, 1320, 0.08);
        break;
      case "swim":       this.noise(0.09, 0.05, 900, B); break;
      case "jump":       this.tone(420, 0.13, "sine", 0.2, B, 780); break;
      case "boost":
        this.noise(0.3, 0.16, 2400, B);
        this.tone(200, 0.3, "sawtooth", 0.14, B, 760);
        break;
      case "dash":
        this.noise(0.16, 0.13, 2000, B);
        this.tone(300, 0.16, "triangle", 0.12, B, 700);
        break;
      case "hit":
        this.noise(0.14, 0.22, 1400, B);
        this.tone(180, 0.14, "square", 0.18, B, 70);
        break;
      case "explode":
        this.noise(0.5, 0.3, 1800, B);
        this.tone(110, 0.45, "sawtooth", 0.2, B, 34);
        break;
      case "blast":
        this.noise(0.4, 0.26, 2200, B);
        this.tone(150, 0.4, "sawtooth", 0.2, B, 44);
        break;
      case "monadBlast":
        // dramatic: rising charge then huge boom
        this.tone(120, 0.55, "sawtooth", 0.14, B, 900);
        this.tone(240, 0.55, "square", 0.08, B, 1400);
        this.noise(0.85, 0.34, 3000, B, 0.5);
        this.tone(80, 0.9, "sawtooth", 0.26, B, 28, 0.5);
        this.tone(440, 0.5, "sine", 0.14, B, 110, 0.52);
        break;
      case "coin":
        this.tone(1046, 0.07, "square", 0.14, B);
        this.tone(1568, 0.11, "square", 0.12, B, undefined, 0.05);
        break;
      case "combo":
        this.tone(880, 0.06, "square", 0.13, B);
        this.tone(1320, 0.06, "square", 0.12, B, undefined, 0.05);
        this.tone(1760, 0.12, "square", 0.12, B, undefined, 0.1);
        break;
      case "mutate":
        this.tone(300, 0.4, "sine", 0.16, B, 1200);
        this.tone(450, 0.4, "triangle", 0.1, B, 200);
        break;
      case "powerup":
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, 0.12, "square", 0.13, B, undefined, i * 0.06));
        break;
      case "eliminate":
        this.tone(400, 0.5, "sawtooth", 0.2, B, 60);
        this.noise(0.4, 0.2, 1000, B);
        break;
      case "victory":
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.28, "square", 0.16, B, undefined, i * 0.13));
        break;
      case "defeat":
        [440, 370, 294, 220].forEach((f, i) =>
          this.tone(f, 0.32, "triangle", 0.16, B, undefined, i * 0.16));
        break;
      case "warning":
        this.tone(880, 0.16, "square", 0.18, B);
        this.tone(880, 0.16, "square", 0.18, B, undefined, 0.22);
        break;
    }
  }

  /* ── MUSIC ─────────────────────────────────────────────────── */
  setScene(scene: MusicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    this.step = 0;
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (!scene) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const tempos: Record<Exclude<MusicScene, null>, number> = {
      menu: 300, arena: 200, dash: 168, boss: 132, egg: 240,
    };
    this.musicTimer = setInterval(() => this.tickMusic(), tempos[scene]);
  }

  private tickMusic(): void {
    if (!this.ctx || this.muted || !this.scene) return;
    const M = this.musicBus;
    const s = this.step++;

    // pentatonic-ish scales keep everything consonant
    const scales: Record<Exclude<MusicScene, null>, number[]> = {
      menu: [220, 262, 294, 349, 392],
      arena: [147, 175, 196, 233, 262],
      dash: [196, 233, 262, 294, 349],
      boss: [110, 131, 147, 156, 175],
      egg: [262, 330, 392, 523, 659],
    };
    const scale = scales[this.scene];

    switch (this.scene) {
      case "menu": {
        if (s % 4 === 0) this.tone(scale[(s / 4) % scale.length], 1.1, "sine", 0.05, M);
        if (s % 8 === 2) this.tone(scale[(s / 2) % scale.length] * 2, 0.7, "triangle", 0.025, M);
        break;
      }
      case "arena": {
        // driving bass + hats
        if (s % 2 === 0) this.tone(scale[0] / 2, 0.18, "square", 0.06, M);
        if (s % 4 === 2) this.noise(0.05, 0.03, 6000, M);
        if (s % 8 === 0) this.tone(scale[(s / 8) % scale.length], 0.5, "sawtooth", 0.035, M);
        if (s % 16 === 12) this.tone(scale[3] * 2, 0.3, "square", 0.03, M);
        break;
      }
      case "dash": {
        // fast arp
        this.tone(scale[s % scale.length] * 2, 0.1, "square", 0.032, M);
        if (s % 4 === 0) this.tone(scale[0] / 2, 0.16, "sawtooth", 0.055, M);
        if (s % 4 === 2) this.noise(0.04, 0.025, 7000, M);
        break;
      }
      case "boss": {
        if (s % 2 === 0) this.tone(scale[0] / 2, 0.3, "sawtooth", 0.085, M);
        if (s % 4 === 1) this.tone(scale[(s / 4) % scale.length], 0.25, "square", 0.05, M);
        if (s % 8 === 4) this.noise(0.18, 0.06, 900, M);
        break;
      }
      case "egg": {
        // bright shimmering
        if (s % 3 === 0) this.tone(scale[s % scale.length], 1.4, "sine", 0.045, M);
        if (s % 6 === 3) this.tone(scale[(s + 2) % scale.length] * 2, 1.0, "triangle", 0.03, M);
        break;
      }
    }
  }

  stopMusic(): void {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.scene = null;
  }
}

export const audio = new AudioEngine();

/** Convenience for React event handlers. */
export const sfx = (s: Sfx) => audio.play(s);
