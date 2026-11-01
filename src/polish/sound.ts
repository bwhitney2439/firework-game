/**
 * Small generated sounds made with the Web Audio API. No audio files.
 *
 * Browsers only allow audio after a user gesture, so nothing plays until
 * unlock() is called from a click or key press.
 */
export interface Sound {
  /** Creates or resumes the audio context. Call it from a user gesture. */
  unlock(): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  /** A rising whoosh as a firework leaves the ground. */
  launch(): void;
  /** A bang with a crackle for a popped firework. */
  burst(): void;
  /** A soft fizz and a disappointed "aww" from the crowd. */
  fizzle(): void;
  /** Crowd cheering. Strength runs from 0 (polite) to 1 (wild). */
  cheer(strength: number): void;
}

/** Combo length that gives the loudest cheer for a single pop. */
const COMBO_FOR_FULL_CHEER = 8;
/** A single pop never cheers louder than this; the end of the show can. */
const POP_CHEER_MAX = 0.6;

/** Cheer strength for a pop: it grows with the combo, up to POP_CHEER_MAX. */
export function popCheer(combo: number): number {
  return Math.min(Math.max(combo, 0) / COMBO_FOR_FULL_CHEER, POP_CHEER_MAX);
}

/** The parts of AudioContext the sounds use, so tests can pass a fake. */
export type AudioContextLike = Pick<
  AudioContext,
  | "currentTime"
  | "destination"
  | "sampleRate"
  | "state"
  | "resume"
  | "createGain"
  | "createOscillator"
  | "createBufferSource"
  | "createBiquadFilter"
  | "createBuffer"
>;

const MASTER_VOLUME = 0.5;
const NOISE_SECONDS = 3;

function browserContext(): AudioContextLike | null {
  const Ctor =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function createSound(
  makeContext: () => AudioContextLike | null = browserContext,
  random: () => number = Math.random,
): Sound {
  let ctx: AudioContextLike | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  /** The context and output to play into, or null when nothing should play. */
  function output(): { ctx: AudioContextLike; out: GainNode } | null {
    if (muted || !ctx || !master || ctx.state !== "running") return null;
    return { ctx, out: master };
  }

  function noiseSource(audio: AudioContextLike): AudioBufferSourceNode {
    if (!noise) {
      const length = audio.sampleRate * NOISE_SECONDS;
      noise = audio.createBuffer(1, length, audio.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = random() * 2 - 1;
    }
    const source = audio.createBufferSource();
    source.buffer = noise;
    return source;
  }

  /** A gain node that rises to peak and fades away over the given seconds. */
  function envelope(
    audio: AudioContextLike,
    out: AudioNode,
    peak: number,
    attack: number,
    length: number,
  ): GainNode {
    const now = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    gain.connect(out);
    return gain;
  }

  function playNoise(
    audio: AudioContextLike,
    into: AudioNode,
    length: number,
  ): void {
    const source = noiseSource(audio);
    source.connect(into);
    // Start part way into the buffer so repeated sounds do not match exactly.
    const offset = random() * Math.max(NOISE_SECONDS - length, 0);
    source.start(audio.currentTime, offset);
    source.stop(audio.currentTime + length);
  }

  return {
    unlock() {
      if (!ctx) {
        ctx = makeContext();
        if (!ctx) return;
        master = ctx.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") void ctx.resume();
    },

    isMuted: () => muted,

    setMuted(value) {
      muted = value;
    },

    launch() {
      const o = output();
      if (!o) return;
      const { ctx: audio, out } = o;
      const now = audio.currentTime;
      const length = 0.7;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 4;
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + length);
      filter.connect(envelope(audio, out, 0.35, 0.15, length));
      playNoise(audio, filter, length);
    },

    burst() {
      const o = output();
      if (!o) return;
      const { ctx: audio, out } = o;
      const now = audio.currentTime;

      // The low thump.
      const thump = audio.createOscillator();
      thump.type = "sine";
      thump.frequency.setValueAtTime(150, now);
      thump.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      thump.connect(envelope(audio, out, 0.9, 0.005, 0.35));
      thump.start(now);
      thump.stop(now + 0.35);

      // The bang and crackle, getting duller as it fades.
      const length = 0.9;
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(6000, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + length);
      filter.connect(envelope(audio, out, 0.7, 0.003, length));
      playNoise(audio, filter, length);
    },

    fizzle() {
      const o = output();
      if (!o) return;
      const { ctx: audio, out } = o;
      const now = audio.currentTime;

      const fizz = audio.createBiquadFilter();
      fizz.type = "highpass";
      fizz.frequency.value = 3000;
      fizz.connect(envelope(audio, out, 0.12, 0.02, 0.4));
      playNoise(audio, fizz, 0.4);

      // "Aww": a few voices sliding down together.
      for (const start of [330, 345, 415]) {
        const voice = audio.createOscillator();
        voice.type = "triangle";
        voice.frequency.setValueAtTime(start, now);
        voice.frequency.exponentialRampToValueAtTime(start * 0.7, now + 0.8);
        voice.connect(envelope(audio, out, 0.05, 0.12, 0.9));
        voice.start(now);
        voice.stop(now + 0.9);
      }
    },

    cheer(strength) {
      const o = output();
      if (!o) return;
      const { ctx: audio, out } = o;
      const amount = Math.min(Math.max(strength, 0), 1);
      const length = 0.6 + amount * 1.6;

      // Crowd noise sits in the voice range; two bands make it fuller.
      for (const centre of [900, 2200]) {
        const filter = audio.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 0.9;
        filter.frequency.value = centre * (0.9 + random() * 0.2);
        filter.connect(
          envelope(audio, out, 0.15 + amount * 0.35, 0.2, length),
        );
        playNoise(audio, filter, length);
      }
    },
  };
}
