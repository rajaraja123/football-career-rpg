export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const r1 = (v: number) => Math.round(v * 10) / 10;

/** Format uang dalam ribu euro (€K) -> "€5K" / "€1.2M" */
export function money(k: number): string {
  const sign = k < 0 ? '-' : '';
  const a = Math.abs(k);
  if (a >= 1000) return `${sign}€${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}M`;
  return `${sign}€${a >= 100 ? Math.round(a) : a.toFixed(a >= 10 ? 0 : 1)}K`;
}
