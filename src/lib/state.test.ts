import { describe, it, expect } from "vitest";
import {
  validateSettings,
  remaining,
  blankTimer,
  breathPhase,
  clock,
} from "./state";
describe("persistent state validation", () => {
  it("rejects malformed root and ignores unknown fields", () => {
    expect(() => validateSettings(null)).toThrow();
    const s = validateSettings({
      scene: 999,
      brightness: -1,
      master: Infinity,
      favorites: [1, 1, 0, 33, "2"],
      levels: [-1, 2, NaN, 0.5, 0, 1],
      worry: "private",
    });
    expect(s.scene).toBe(32);
    expect(s.master).toBe(0.6);
    expect(s.favorites).toEqual([1]);
    expect(s.levels).toEqual([0, 1, 0, 0.5, 0, 1]);
    expect(s).not.toHaveProperty("worry");
  });
  it("limits preset count and normalizes numbers", () => {
    const s = validateSettings({
      presets: Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        name: "x",
        levels: [2, 0, 0, 0, 0, 0],
      })),
    });
    expect(s.presets).toHaveLength(30);
    expect(s.presets[0].levels[0]).toBe(1);
  });
});
describe("wall clock timer", () => {
  it("corrects background elapsed time and never goes negative", () => {
    const t = { ...blankTimer, status: "running" as const, deadline: 100000 };
    expect(remaining(t, 40000)).toBe(60000);
    expect(remaining(t, 150000)).toBe(0);
  });
  it("does not consume time while paused", () => {
    expect(
      remaining({ ...blankTimer, status: "paused", remaining: 2000 }, 999999),
    ).toBe(2000);
  });
  it("formats remaining seconds with ceiling", () => {
    expect(clock(1)).toBe("00:01");
    expect(clock(60000)).toBe("01:00");
  });
});
describe("breathing", () => {
  it("skips zero hold and wraps cycles", () => {
    expect(breathPhase(4000, [4, 0, 6]).index).toBe(2);
    expect(breathPhase(10000, [4, 0, 6]).index).toBe(0);
  });
  it("supports custom hold", () => {
    expect(breathPhase(5000, [4, 2, 6])).toEqual({ index: 1, left: 1 });
  });
});
