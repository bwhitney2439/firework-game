import { describe, expect, it, vi } from "vitest";
import {
  type AudioContextLike,
  SOUND_KEY,
  VOLUME_GAINS,
  createSound,
  loadVolume,
  nextVolume,
  popCheer,
  saveVolume,
} from "./sound";

/** Just enough of an AudioContext to count the nodes each sound makes. */
function fakeContext(state: AudioContextState = "running") {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() });
  const created: string[] = [];
  const gains: { gain: { value: number } }[] = [];
  const ctx = {
    currentTime: 0,
    sampleRate: 100,
    destination: {},
    state,
    resume: vi.fn(async () => {
      ctx.state = "running";
    }),
    createGain: () => {
      created.push("gain");
      const gain = { ...node(), gain: param() };
      gains.push(gain);
      return gain;
    },
    createOscillator: () => {
      created.push("oscillator");
      return { ...node(), frequency: param() };
    },
    createBiquadFilter: () => {
      created.push("filter");
      return { ...node(), frequency: param(), Q: param() };
    },
    createBufferSource: () => {
      created.push("source");
      return { ...node(), buffer: null };
    },
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
  };
  return { ctx, created, gains, asContext: ctx as unknown as AudioContextLike };
}

function playAll(sound: ReturnType<typeof createSound>): void {
  sound.launch();
  sound.burst();
  sound.fizzle();
  sound.cheer(0.5);
}

describe("sound", () => {
  it("does nothing before it is unlocked", () => {
    const fake = fakeContext();
    const make = vi.fn(() => fake.asContext);
    playAll(createSound(make));
    expect(make).not.toHaveBeenCalled();
  });

  it("makes one audio context and plays every sound after unlock", () => {
    const fake = fakeContext();
    const make = vi.fn(() => fake.asContext);
    const sound = createSound(make);
    sound.unlock();
    sound.unlock();
    expect(make).toHaveBeenCalledTimes(1);

    const before = fake.created.length;
    for (const play of [
      () => sound.launch(),
      () => sound.burst(),
      () => sound.fizzle(),
      () => sound.cheer(1),
    ]) {
      const count = fake.created.length;
      play();
      expect(fake.created.length).toBeGreaterThan(count);
    }
    expect(fake.created.length).toBeGreaterThan(before);
  });

  it("resumes a suspended context on unlock", () => {
    const fake = fakeContext("suspended");
    const sound = createSound(() => fake.asContext);
    sound.unlock();
    expect(fake.ctx.resume).toHaveBeenCalled();
  });

  it("stays silent while muted", () => {
    const fake = fakeContext();
    const sound = createSound(() => fake.asContext);
    sound.unlock();
    sound.setMuted(true);
    expect(sound.isMuted()).toBe(true);
    const before = fake.created.length;
    playAll(sound);
    expect(fake.created.length).toBe(before);

    sound.setMuted(false);
    sound.burst();
    expect(fake.created.length).toBeGreaterThan(before);
  });

  it("sets the output gain from the volume level", () => {
    const fake = fakeContext();
    const sound = createSound(() => fake.asContext, Math.random, 1);
    sound.unlock();
    const master = fake.gains[0];
    expect(sound.volume()).toBe(1);
    expect(master.gain.value).toBe(VOLUME_GAINS[1]);

    sound.setVolume(2);
    expect(master.gain.value).toBe(VOLUME_GAINS[2]);
    expect(VOLUME_GAINS[1]).toBeLessThan(VOLUME_GAINS[2]);

    sound.setVolume(0);
    expect(master.gain.value).toBe(0);
    expect(sound.isMuted()).toBe(true);
  });

  it("keeps a volume set before unlock", () => {
    const fake = fakeContext();
    const sound = createSound(() => fake.asContext);
    sound.setVolume(1);
    sound.unlock();
    expect(fake.gains[0].gain.value).toBe(VOLUME_GAINS[1]);
  });

  it("is silent at volume 0 and plays again at low", () => {
    const fake = fakeContext();
    const sound = createSound(() => fake.asContext);
    sound.unlock();
    sound.setVolume(0);
    const before = fake.created.length;
    playAll(sound);
    expect(fake.created.length).toBe(before);

    sound.setVolume(1);
    expect(sound.isMuted()).toBe(false);
    sound.burst();
    expect(fake.created.length).toBeGreaterThan(before);
  });

  it("unmutes back to the volume heard before muting", () => {
    const fake = fakeContext();
    const sound = createSound(() => fake.asContext);
    sound.unlock();
    sound.setVolume(1);
    sound.setMuted(true);
    expect(sound.volume()).toBe(0);
    sound.setMuted(false);
    expect(sound.volume()).toBe(1);
    expect(fake.gains[0].gain.value).toBe(VOLUME_GAINS[1]);
  });

  it("unmutes to high when it started muted", () => {
    const sound = createSound(() => null, Math.random, 0);
    expect(sound.isMuted()).toBe(true);
    sound.setMuted(false);
    expect(sound.volume()).toBe(2);
  });

  it("does not fail when the browser has no Web Audio", () => {
    const sound = createSound(() => null);
    sound.unlock();
    expect(() => playAll(sound)).not.toThrow();
  });
});

describe("pop cheer", () => {
  it("grows with the combo", () => {
    expect(popCheer(1)).toBeLessThan(popCheer(2));
    expect(popCheer(2)).toBeLessThan(popCheer(4));
  });

  it("stays below the end-of-show cheer for long combos", () => {
    expect(popCheer(100)).toBe(0.6);
    expect(popCheer(0)).toBe(0);
  });
});

describe("volume steps", () => {
  it("go off, low, high and round again", () => {
    expect(nextVolume(0)).toBe(1);
    expect(nextVolume(1)).toBe(2);
    expect(nextVolume(2)).toBe(0);
  });
});

describe("remembered volume", () => {
  function fakeStorage(start: Record<string, string> = {}) {
    const data = { ...start };
    return {
      data,
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
    };
  }

  it("saves and loads under its own key", () => {
    const storage = fakeStorage();
    saveVolume(1, storage);
    expect(storage.data).toEqual({ [SOUND_KEY]: "1" });
    expect(loadVolume(storage)).toBe(1);
    saveVolume(0, storage);
    expect(loadVolume(storage)).toBe(0);
  });

  it("is high when nothing or something odd is saved", () => {
    expect(loadVolume(fakeStorage())).toBe(2);
    expect(loadVolume(fakeStorage({ [SOUND_KEY]: "7" }))).toBe(2);
    expect(loadVolume(fakeStorage({ [SOUND_KEY]: "loud" }))).toBe(2);
    expect(loadVolume(null)).toBe(2);
  });

  it("copes with storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadVolume(broken)).toBe(2);
    expect(() => saveVolume(1, broken)).not.toThrow();
  });
});
