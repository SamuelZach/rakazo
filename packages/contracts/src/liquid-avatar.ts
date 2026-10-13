import * as z from "zod";

export const LIQUID_AVATAR_SHAPES = [
  "circle",
  "squircle",
  "droplet",
  "capsule",
  "cloud",
  "heart",
  "star",
  "ghost",
  "egg",
  "hexagon",
  "bean",
] as const;
export const LIQUID_AVATAR_EYES = ["tall", "round", "cyclops", "ring"] as const;
export const LIQUID_AVATAR_MOTIONS = ["classic", "floaty", "bouncy", "jelly"] as const;
export const LIQUID_AVATAR_EXTRAS = ["none", "drip", "orbit", "drip-orbit"] as const;
export const LiquidAvatarOptionsSchema = z
  .object({
    shape: z.enum(LIQUID_AVATAR_SHAPES),
    eyes: z.enum(LIQUID_AVATAR_EYES),
    motion: z.enum(LIQUID_AVATAR_MOTIONS),
    extra: z.enum(LIQUID_AVATAR_EXTRAS),
    speed: z.number().min(0.1).max(4),
  })
  .strict();
export type LiquidAvatarOptions = z.infer<typeof LiquidAvatarOptionsSchema>;
export const DEFAULT_LIQUID_AVATAR: LiquidAvatarOptions = {
  shape: "circle",
  eyes: "tall",
  motion: "classic",
  extra: "none",
  speed: 1,
};

/** Versioned compact value in the existing avatar field; no image URLs or executable input. */
export function encodeLiquidAvatar(color: string, options: LiquidAvatarOptions): string {
  if (!/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)) throw new Error("Invalid avatar color");
  const value = LiquidAvatarOptionsSchema.parse(options);
  return `${color}::liquid1_${value.shape}_${value.eyes}_${value.motion}_${value.extra}_${value.speed}`;
}

export function parseLiquidAvatar(
  raw: string,
): { color: string; options: LiquidAvatarOptions } | null {
  const match = raw.match(
    /^(#[a-f\d]{3}(?:[a-f\d]{3})?)::liquid1_([a-z]+)_([a-z]+)_([a-z]+)_([a-z-]+)_(\d+(?:\.\d+)?)$/i,
  );
  if (!match) return null;
  const options = LiquidAvatarOptionsSchema.safeParse({
    shape: match[2],
    eyes: match[3],
    motion: match[4],
    extra: match[5],
    speed: Number(match[6]),
  });
  return options.success ? { color: match[1] ?? "", options: options.data } : null;
}
