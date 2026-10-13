import { describe, expect, it } from "vitest";
import { botColors, botMessageColors, darkTokens } from "./index.js";

function luminance(hex: string): number {
  const digits = hex.slice(1);
  const expanded =
    digits.length === 3 ? [...digits].map((digit) => digit.repeat(2)).join("") : digits;
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

describe("bot message colors", () => {
  it.each([...botColors, "#EAB308", "#8B5CF6", "#FFFFFF", "#000000", "#777", "#abc"])(
    "keeps %s as the fill with readable text",
    (color) => {
      const result = botMessageColors(color);
      expect(result.background).toBe(color);
      const values = [luminance(result.background), luminance(result.foreground)].sort(
        (a, b) => b - a,
      );
      expect((values[0]! + 0.05) / (values[1]! + 0.05)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("falls back for invalid colors", () => {
    expect(botMessageColors("invalid")).toEqual({
      background: darkTokens.chatUser,
      foreground: darkTokens.chatUserForeground,
    });
  });
});
