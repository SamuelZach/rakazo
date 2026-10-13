import type { RefObject } from "react";
import { useEffect, useState } from "react";

/** Hover the bot's row or card, including the avatar itself. Touch does not latch a preview. */
export function useAvatarHover(ref: RefObject<HTMLElement | SVGElement | null>, enabled = true) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const target = element.closest("button, a, [role='button'], article") ?? element;
    const enter = (event: Event) => {
      if (
        event instanceof PointerEvent &&
        (event.pointerType === "mouse" || event.pointerType === "pen")
      )
        setHovered(true);
    };
    const leave = () => setHovered(false);
    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointerleave", leave);
    if (window.matchMedia("(hover: hover)").matches) setHovered(target.matches(":hover"));
    return () => {
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointerleave", leave);
    };
  }, [ref, enabled]);
  return enabled && hovered;
}
