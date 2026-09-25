import type { GameState, LogKind } from './types';

export function log(g: GameState, k: LogKind, text: string, tag?: string) {
  g.log.push({ k, text, tag });
  if (g.log.length > 600) g.log.splice(0, g.log.length - 600);
}
