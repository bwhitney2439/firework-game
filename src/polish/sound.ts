/**
 * Small generated sounds made with the Web Audio API. No audio files.
 *
 * Browsers only allow audio after a user gesture, so nothing plays until
 * unlock() is called from a click or key press.
 */
export interface Sound {
  /** Creates or resumes the audio context. Call it from a user gesture. */
  unlock(): void;
  /** True at volume 0. */
  isMuted(): boolean;
  /** Muting goes to volume 0; unmuting goes back to the last volume heard. */
  setMuted(muted: boolean): void;
  volume(): VolumeLevel;
  setVolume(level: VolumeLevel): void;
  /** A rising whoosh as a firework leaves the ground. */
  launch(): void;
  /** A bang with a crackle for a popped firework. */
  burst(): void;
  /** A soft fizz and a disappointed "aww" from the crowd. */
  fizzle(): void;
  /** Crowd cheering. Strength runs from 0 (polite) to 1 (wild). */
  cheer(strength: number): void;
}

/** Sound volume steps: 0 is off (muted), 1 is low and 2 is high. */
export type VolumeLevel = 0 | 1 | 2;

/** Output gain for each volume level. High is the game's original volume. */
export const VOLUME_GAINS: Record<VolumeLevel, number> = [0, 0.2, 0.5];

/** Names for the volume levels, as the pause menu shows them. */
export const VOLUME_NAMES: Record<VolumeLevel, string> = ["off", "low", "high"];

/** The level after `level` when the Sound button is pressed: off, low, high, off. */
export function nextVolume(level: VolumeLevel): VolumeLevel {
  return ((level + 1) % 3) as VolumeLevel;
}

/**
 * localStorage key for the volume. It is kept out of the game save so the
 * save format doesn't change.
 */
export const SOUND_KEY = "bonfire-night-popper/sound";

/** The part of localStorage the volume setting uses, so tests can pass a fake. */
export type SoundStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): SoundStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The remembered volume, or high when there is none or it can't be read. */
export function loadVolume(
  storage: SoundStorage | null = defaultStorage(),
): VolumeLevel {
  try {
    const value = storage?.getItem(SOUND_KEY);
    return value === "0" || value === "1" ? (Number(value) as VolumeLevel) : 2;
  } catch {
    return 2;
  }
}

/** Remembers the volume. Does nothing if storage is full or blocked. */
export function saveVolume(
  level: VolumeLevel,
  storage: SoundStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(SOUND_KEY, String(level));
  } catch {
    // Private mode or a full quota: the setting just isn't remembered.
  }
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
  startVolume: VolumeLevel = 2,
): Sound {
  let ctx: AudioContextLike | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let level: VolumeLevel = startVolume;
  /** The volume unmuting goes back to. */
  let unmutedLevel: VolumeLevel = startVolume === 0 ? 2 : startVolume;

  function applyVolume(): void {
    if (master) master.gain.value = VOLUME_GAINS[level];
  }

  function setVolume(value: VolumeLevel): void {
    level = value;
    if (value !== 0) unmutedLevel = value;
    applyVolume();
  }

  /** The context and output to play into, or null when nothing should play. */
  function output(): { ctx: AudioContextLike; out: GainNode } | null {
    if (level === 0 || !ctx || !master || ctx.state !== "running") return null;
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
        applyVolume();
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") void ctx.resume();
    },

    isMuted: () => level === 0,

    setMuted(muted) {
      setVolume(muted ? 0 : unmutedLevel);
    },

    volume: () => level,

    setVolume,

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
