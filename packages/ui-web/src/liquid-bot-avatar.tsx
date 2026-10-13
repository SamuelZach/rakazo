import type { LiquidAvatarOptions } from "@rakazo/core";
import { createLiquidBot } from "@rakazo/core";
import { tokens } from "@rakazo/ui-tokens";
import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "./lib/utils.js";
import { useAvatarHover } from "./use-avatar-hover.js";

export function LiquidBotAvatar({
  color,
  identity = "",
  size = 36,
  isWorking = false,
  className,
  options,
  animated = true,
}: {
  color: string;
  identity?: string;
  size?: number;
  isWorking?: boolean;
  className?: string;
  options?: LiquidAvatarOptions;
  animated?: boolean;
}) {
  const id = useId();
  const host = useRef<HTMLSpanElement>(null);
  const hovered = useAvatarHover(host, animated);
  const active = isWorking || hovered;
  const bot = useMemo(
    () => createLiquidBot({ color, identity, namespace: id, eyeColor: tokens.background, options }),
    [color, identity, id, isWorking, options, active],
  );
  const initial = useMemo(() => bot.frame(0, isWorking, true), [bot, isWorking]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    if (!animated || !active) {
      element.innerHTML = initial;
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let elapsed = 0;
    let lastTime = performance.now();
    const paint = () => {
      element.innerHTML = bot.frame(elapsed, isWorking, media.matches);
    };
    let unsubscribe: (() => void) | undefined;
    const refresh = () => {
      if (visible && !document.hidden && !media.matches) {
        if (unsubscribe) return;
        lastTime = performance.now();
        unsubscribe = subscribeFrames((now) => {
          elapsed += Math.min((now - lastTime) / 1000, 0.1);
          lastTime = now;
          paint();
        });
      } else {
        unsubscribe?.();
        unsubscribe = undefined;
        if (media.matches) element.innerHTML = initial;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      refresh();
    });
    observer.observe(element);
    media.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      observer.disconnect();
      unsubscribe?.();
      media.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [bot, isWorking, animated, active, initial]);

  return (
    <span
      ref={host}
      aria-hidden="true"
      className={cn(
        "rakazo-bot-avatar rakazo-liquid-avatar inline-flex shrink-0 select-none",
        className,
      )}
      data-working={isWorking}
      style={{ display: "inline-flex", flex: "none", width: size, height: size, lineHeight: 0 }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: shared engine emits trusted geometry and validated colors only.
      dangerouslySetInnerHTML={{ __html: initial }}
    />
  );
}

const listeners = new Set<(now: number) => void>();
let animationFrame = 0;
let lastFrame = 0;
function animate(now: number) {
  if (now - lastFrame >= 50) {
    lastFrame = now;
    for (const listener of listeners) listener(now);
  }
  if (listeners.size) animationFrame = requestAnimationFrame(animate);
}
function subscribeFrames(listener: (now: number) => void) {
  listeners.add(listener);
  if (listeners.size === 1) animationFrame = requestAnimationFrame(animate);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) cancelAnimationFrame(animationFrame);
  };
}
