import { trackIds } from "./state";
class AudioEngine {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  buffers: (AudioBuffer | null)[] = Array(6).fill(null);
  sources: AudioBufferSourceNode[] = [];
  gains: GainNode[] = [];
  generation = 0;
  active = false;
  async prepare(levels: number[]) {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
    await Promise.all(
      trackIds.map(async (id, i) => {
        if (this.buffers[i]) return;
        try {
          const r = await fetch(`/audio/${id}.mp3`);
          if (!r.ok) throw new Error("Unavailable");
          this.buffers[i] = await this.context!.decodeAudioData(
            await r.arrayBuffer(),
          );
        } catch {
          this.buffers[i] = null;
        }
      }),
    );
    if (levels.some((v, i) => v > 0 && !this.buffers[i]))
      throw new Error("현재 믹스에 필요한 음원이 없습니다.");
  }
  async play(levels: number[], master: number, fade: number) {
    const token = ++this.generation;
    await this.prepare(levels);
    if (token !== this.generation) return false;
    this.stopSources();
    const ctx = this.context!;
    this.sources = this.buffers.map((buffer, i) => {
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = levels[i];
      source.connect(gain);
      gain.connect(this.master!);
      this.gains[i] = gain;
      if (buffer) source.start();
      return source;
    });
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setValueAtTime(0, ctx.currentTime);
    this.master!.gain.linearRampToValueAtTime(master, ctx.currentTime + fade);
    this.active = true;
    return true;
  }
  set(levels: number[], master: number) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.gains.forEach((g, i) => {
      g.gain.setTargetAtTime(levels[i], now, 0.08);
      if (levels[i] > 0 && !this.buffers[i])
        window.dispatchEvent(new CustomEvent("still-audio-missing"));
    });
    if (this.active) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(master, now, 0.1);
    }
  }
  pause(fade: number) {
    const token = ++this.generation;
    this.active = false;
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(
      () => {
        if (token === this.generation) {
          this.stopSources();
          void this.context?.suspend();
        }
      },
      fade * 1000 + 30,
    );
  }
  stopSources() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    });
    this.gains.forEach((g) => g.disconnect());
    this.sources = [];
    this.gains = [];
  }
  async chime() {
    if (!this.context || this.context.state !== "running") return false;
    const c = this.context;
    for (const [i, f] of [523.25, 783.99].entries()) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(c.destination);
      const at = c.currentTime + i * 0.25;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.045, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
      o.start(at);
      o.stop(at + 1.7);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    return true;
  }
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    await this.context.resume();
  }
  dispose() {
    ++this.generation;
    this.stopSources();
    this.buffers = Array(6).fill(null);
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.active = false;
  }
}
export const audio = new AudioEngine();
