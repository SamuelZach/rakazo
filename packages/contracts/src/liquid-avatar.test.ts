import { describe, expect, it } from "vitest";
import { BotAvatarValueSchema, parseBotAvatarValue, updateLiquidAvatar } from "./bot-avatar.js";
import {
  DEFAULT_LIQUID_AVATAR,
  encodeLiquidAvatar,
  LIQUID_AVATAR_SHAPES,
  parseLiquidAvatar,
} from "./liquid-avatar.js";

describe("per-bot liquid appearance", () => {
  it.each(LIQUID_AVATAR_SHAPES)("persists and reads %s with all choices", (shape) => {
    const options = {
      ...DEFAULT_LIQUID_AVATAR,
      shape,
      eyes: "ring" as const,
      motion: "jelly" as const,
      extra: "drip-orbit" as const,
      speed: 0.75,
    };
    const value = encodeLiquidAvatar("#3B82F6", options);
    expect(BotAvatarValueSchema.safeParse(value).success).toBe(true);
    expect(parseBotAvatarValue(value)).toEqual({ kind: "liquid", color: "#3B82F6", options });
  });
  it("preserves options when color or a single choice changes", () => {
    const initial = updateLiquidAvatar("#3B82F6", { shape: "ghost", eyes: "cyclops" });
    const updated = updateLiquidAvatar(initial, { motion: "floaty" }, "#D9508A");
    expect(parseLiquidAvatar(updated)).toEqual({
      color: "#D9508A",
      options: { ...DEFAULT_LIQUID_AVATAR, shape: "ghost", eyes: "cyclops", motion: "floaty" },
    });
    expect(parseLiquidAvatar(initial)?.color).toBe("#3B82F6");
  });
  it.each([
    "#fff::liquid1_unknown_tall_classic_none_1",
    "#fff::liquid1_circle_tall_classic_none_0",
    "#fff::liquid1_circle_tall_classic_none_5",
    "#fff::liquid1_circle_tall_classic_none_1junk",
    "#fff::liquid1_circle_bad_classic_none_1",
    "#fff::liquid1_circle_tall_classic_script_1",
  ])("rejects malformed appearance %s", (value) => {
    expect(parseLiquidAvatar(value)).toBeNull();
    expect(BotAvatarValueSchema.safeParse(value).success).toBe(false);
  });
});
