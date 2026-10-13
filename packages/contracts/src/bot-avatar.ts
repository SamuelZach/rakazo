import * as z from "zod";
import { BOT_COLORS } from "./ids.js";
import type { LiquidAvatarOptions } from "./liquid-avatar.js";
import { DEFAULT_LIQUID_AVATAR, encodeLiquidAvatar, parseLiquidAvatar } from "./liquid-avatar.js";

export * from "./liquid-avatar.js";

/** Matches the eight shipped mascot shapes in `@rakazo/core`. */
export const BOT_AVATAR_SHAPE_COUNT = 8;

/**
 * 256x256 webp data URLs from Avatar Studio stay well under this. Cap writes so
 * a pasted raw photo cannot bloat every bot list payload.
 */
export const BOT_AVATAR_VALUE_MAX_LENGTH = 200_000;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SHAPE_SUFFIX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})::shape_\d+$/;
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

export type ParsedBotAvatar =
  | { kind: "liquid"; color: string; options: LiquidAvatarOptions }
  | { kind: "image"; imageUrl: string }
  | { kind: "shape"; color: string; shapeIndex: number }
  | { kind: "color"; color: string }
  | { kind: "other"; raw: string };

export function parseBotAvatarValue(raw: string): ParsedBotAvatar {
  const liquid = parseLiquidAvatar(raw);
  if (liquid) return { kind: "liquid", ...liquid };
  if (raw.startsWith("data:image/")) {
    return { kind: "image", imageUrl: raw };
  }
  if (raw.includes("::shape_")) {
    const parts = raw.split("::shape_");
    const color = parts[0] || "#F97316";
    const rawShape = parts[1] ?? "0";
    const parsedShape = /^\d+$/.test(rawShape) ? Number(rawShape) : 0;
    const shapeIndex = Number.isSafeInteger(parsedShape) ? parsedShape % BOT_AVATAR_SHAPE_COUNT : 0;
    return { kind: "shape", color, shapeIndex };
  }
  if (HEX_COLOR.test(raw)) return { kind: "color", color: raw };
  return { kind: "other", raw };
}

/** True for values we persist on `bots.color` (hex, encoded shape, or data image). */
export function isBotAvatarValue(raw: string): boolean {
  if (!raw || raw.length > BOT_AVATAR_VALUE_MAX_LENGTH) return false;
  return (
    HEX_COLOR.test(raw) ||
    SHAPE_SUFFIX.test(raw) ||
    DATA_IMAGE.test(raw) ||
    parseLiquidAvatar(raw) !== null
  );
}

export const BotAvatarValueSchema = z
  .string()
  .min(1)
  .max(BOT_AVATAR_VALUE_MAX_LENGTH)
  .refine(isBotAvatarValue, { message: "Invalid bot avatar" });

/** Update one choice without discarding the bot's other appearance settings. */
export function updateLiquidAvatar(
  raw: string,
  patch: Partial<LiquidAvatarOptions>,
  color?: string,
): string {
  const parsed = parseBotAvatarValue(raw);
  const currentColor =
    "color" in parsed && HEX_COLOR.test(parsed.color) ? parsed.color : BOT_COLORS[0];
  return encodeLiquidAvatar(color ?? currentColor, {
    ...(parsed.kind === "liquid" ? parsed.options : DEFAULT_LIQUID_AVATAR),
    ...patch,
  });
}
