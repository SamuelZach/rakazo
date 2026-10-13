import type { LiquidAvatarOptions } from "@rakazo/contracts";
import { createLiquidBot } from "@rakazo/core";
import { useEffect, useId, useMemo, useState } from "react";
import { AppState, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { mobileTokens } from "../lib/appearance";

export function LiquidBotAvatar({
  color,
  identity = "",
  size,
  isWorking,
  options,
}: {
  color: string;
  identity?: string;
  size: number;
  isWorking: boolean;
  options?: LiquidAvatarOptions;
}) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const eyeColor = mobileTokens().background;
  const bot = useMemo(
    () => createLiquidBot({ color, identity, namespace: id, eyeColor, options }),
    [color, identity, id, eyeColor, isWorking, reducedMotion, options],
  );
  const [xml, setXml] = useState(() => bot.frame(0, isWorking, true));

  useEffect(() => {
    let elapsed = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      clearInterval(interval);
      interval = undefined;
    };
    const start = () => {
      stop();
      setXml(bot.frame(0, isWorking, true));
      if (!isWorking || reducedMotion || AppState.currentState !== "active") return;
      interval = setInterval(() => {
        elapsed += 0.05;
        setXml(bot.frame(elapsed, isWorking, false));
      }, 50);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else stop();
    });
    start();
    return () => {
      stop();
      subscription.remove();
    };
  }, [bot, isWorking, reducedMotion]);

  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
