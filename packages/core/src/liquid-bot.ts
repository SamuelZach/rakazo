import type { LiquidAvatarOptions } from "@rakazo/contracts";
import { DEFAULT_LIQUID_AVATAR } from "@rakazo/contracts";

export type { LiquidAvatarOptions } from "@rakazo/contracts";
export { parseLiquidAvatar } from "@rakazo/contracts";

import { avatarIdentitySeed } from "./avatar-shape.js";
import { resolvePersonaColorDef } from "./bot-avatar-colors.js";
import { makeEngine } from "./liquid-bot-engine.js";
import { configuredLiquidStates, liquidVariant } from "./liquid-bot-options.js";
import type states from "./liquid-bot-states.json";

export type LiquidBotState = keyof typeof states;

/** Waiting for a prompt, approval, or takeover does not represent active work. */
export const BOT_AVATAR_WORKING_STATUSES = ["leased", "running"] as const;

const idleSequence: readonly [LiquidBotState, number][] = [
  ["idle", 4],
  ["curious", 12.8],
  ["happy", 3],
  ["pen", 4.5],
  ["idle", 3],
  ["thinking", 4],
  ["bubble", 4],
  ["idle", 3],
  ["surprised", 3],
  ["bulb", 4],
  ["idle", 3],
  ["talking", 4],
  ["chat", 4],
  ["idle", 3],
  ["drowsy", 5.5],
  ["sleepy", 4],
];
const workingSequence: readonly [LiquidBotState, number][] = [
  ["thinking", 5],
  ["bubble", 4],
  ["thinking", 5],
  ["bulb", 4],
];

/** One independent player per avatar; render output contains only trusted SVG geometry. */
export function createLiquidBot({
  color,
  identity = "",
  namespace,
  eyeColor,
  options = DEFAULT_LIQUID_AVATAR,
}: {
  color: string;
  identity?: string;
  namespace: string;
  eyeColor: string;
  options?: LiquidAvatarOptions;
}) {
  const palette = resolvePersonaColorDef(identity || color, color);
  const safeEyeColor = /^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(eyeColor) ? eyeColor : palette.eyeColor;
  const engine = makeEngine(
    { states: configuredLiquidStates(options), variant: liquidVariant(options) },
    palette.hex,
    safeEyeColor,
    `liquid-${namespace.replace(/[^a-z\d_-]/gi, "")}`,
  );
  const player = engine.Player();
  const phase = (avatarIdentitySeed(identity || palette.hex) % 50) / 10;
  player.go("idle", -2, 1, "flow");

  return {
    frame(time: number, working = false, reducedMotion = false): string {
      time *=
        options.speed /
        (options.motion === "floaty" ? 1.25 : options.motion === "bouncy" ? 0.85 : 1);
      if (reducedMotion) {
        const state = working ? "thinking" : "idle";
        const still = engine.Player();
        still.go(state, -2, 1, "flow");
        return render(still.svg(0));
      }
      const sequence = working ? workingSequence : idleSequence;
      let position = (time + phase) % sequence.reduce((total, [, hold]) => total + hold, 0);
      let state: LiquidBotState = "idle";
      for (const [candidate, hold] of sequence) {
        if (position < hold) {
          state = candidate;
          break;
        }
        position -= hold;
      }
      if (player.name() !== state) player.go(state, time, 1.3, "pour");
      return render(player.svg(time));
    },
  };
}

function render(svg: string): string {
  return svg.replace('width="1000" height="1000"', 'width="100%" height="100%"');
}
