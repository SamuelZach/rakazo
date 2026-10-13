import {
  DEFAULT_LIQUID_AVATAR,
  LIQUID_AVATAR_EXTRAS,
  LIQUID_AVATAR_EYES,
  LIQUID_AVATAR_MOTIONS,
  LIQUID_AVATAR_SHAPES,
} from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import { createLiquidBot } from "./liquid-bot.js";

const options = { color: "#3B82F6", eyeColor: "#101014", identity: "sample", namespace: "test" };

describe("liquid bot", () => {
  it("renders every kit shape and eye combination through face and object transitions", () => {
    const silhouettes = new Set<string>();
    for (const shape of LIQUID_AVATAR_SHAPES) {
      for (const eyes of LIQUID_AVATAR_EYES) {
        const bot = createLiquidBot({
          ...options,
          options: { ...DEFAULT_LIQUID_AVATAR, shape, eyes },
        });
        silhouettes.add(bot.frame(0, false, true));
        for (const time of [0, 1, 4, 8, 18, 23, 30, 40, 50, 60]) {
          expect(bot.frame(time)).not.toMatch(/NaN|Infinity|undefined/);
        }
      }
    }
    expect(silhouettes.size).toBe(LIQUID_AVATAR_SHAPES.length * LIQUID_AVATAR_EYES.length);
  });
  it("supports the kit's motion and effect choices", () => {
    const frames = new Set<string>();
    for (const motion of LIQUID_AVATAR_MOTIONS) {
      for (const extra of LIQUID_AVATAR_EXTRAS) {
        const bot = createLiquidBot({
          ...options,
          options: { ...DEFAULT_LIQUID_AVATAR, motion, extra, speed: 0.75 },
        });
        const frame = bot.frame(2);
        expect(frame).not.toMatch(/NaN|Infinity|undefined/);
        frames.add(frame);
      }
    }
    expect(frames.size).toBe(16);
  });
  it("morphs through every expression without invalid geometry and stays deterministic", () => {
    const first = createLiquidBot(options);
    const second = createLiquidBot(options);
    const frames = new Set<string>();
    for (let time = 0; time < 90; time += 0.25) {
      const svg = first.frame(time);
      expect(svg).toEqual(second.frame(time));
      expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      expect(svg).toContain('fill="#3B82F6"');
      frames.add(svg);
    }
    expect(frames.size).toBeGreaterThan(100);
  });

  it("freezes reduced motion and shows a different working expression", () => {
    const bot = createLiquidBot(options);
    expect(bot.frame(0, false, true)).toEqual(bot.frame(30, false, true));
    expect(bot.frame(0, true, true)).toEqual(bot.frame(30, true, true));
    expect(bot.frame(0, false, true)).not.toEqual(bot.frame(0, true, true));
  });

  it("isolates filters between concurrent avatars", () => {
    const bot = createLiquidBot(options);
    const other = createLiquidBot({ ...options, namespace: "other" });
    expect(bot.frame(0)).toContain('id="liquid-test-goo"');
    expect(other.frame(0)).toContain("url(#liquid-other-goo)");
  });

  it("never puts untrusted colors or namespaces in SVG markup", () => {
    const bot = createLiquidBot({
      ...options,
      color: '"><script>bad()</script>',
      eyeColor: '"><script>bad()</script>',
      namespace: '"><script>bad()</script>',
    });
    expect(bot.frame(0)).not.toMatch(/<script|bad\(\)/);
  });
});
