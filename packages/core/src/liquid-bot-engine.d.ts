export interface LiquidBotPlayer {
  name(): string;
  go(state: string, time: number, duration?: number, mode?: string): void;
  svg(time: number, size?: number, background?: string | null): string;
}

export function makeEngine(
  data: { states: unknown; variant?: Record<string, number> },
  bodyColor: string,
  eyeColor: string,
  namespace: string,
): { Player(): LiquidBotPlayer };
