import { LiquidBotAvatar } from "@rakazo/ui-web";

export function LandingBotAvatar({ color, size = 38, className }: {
  color: string; size?: number; className?: string;
}) {
  return <LiquidBotAvatar color={color} identity={color} size={size} className={className} />;
}
