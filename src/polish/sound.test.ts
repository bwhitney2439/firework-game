import { describe, expect, it, vi } from "vitest";
import { type AudioContextLike, createSound } from "./sound";

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
      return { ...node(), gain: param() };
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
  return { ctx, created, asContext: ctx as unknown as AudioContextLike };
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

  it("does not fail when the browser has no Web Audio", () => {
    const sound = createSound(() => null);
    sound.unlock();
    expect(() => playAll(sound)).not.toThrow();
  });
});
