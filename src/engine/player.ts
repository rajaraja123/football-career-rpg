import type { Attrs, AttrKey, Hero } from './types';
import { clamp } from './util';

export const ATTR_LABEL: Record<AttrKey, string> = {
  pace: 'Kecepatan',
  shooting: 'Tembakan',
  dribbling: 'Dribel',
  passing: 'Umpan',
  physical: 'Fisik',
  mental: 'Mental',
};
export const ATTR_KEYS: AttrKey[] = ['shooting', 'pace', 'dribbling', 'passing', 'physical', 'mental'];

// Bobot atribut untuk overall striker (total = 1)
const OVR_W: Attrs = { shooting: 0.32, pace: 0.18, dribbling: 0.15, physical: 0.12, mental: 0.13, passing: 0.1 };

export function overallOf(a: Attrs): number {
  let s = 0;
  for (const k of ATTR_KEYS) s += a[k] * OVR_W[k];
  return Math.round(s);
}

export const ARCHETYPES: Record<string, { label: string; desc: string; bias: Attrs }> = {
  finisher: {
    label: 'Finisher',
    desc: 'Insting gol tajam, tapi kurang lincah dan kurang kuat.',
    bias: { shooting: 9, mental: 3, physical: -3, pace: -4, passing: -3, dribbling: -2 },
  },
  speedster: {
    label: 'Pelari Cepat',
    desc: 'Kencang dan lincah, finishing masih kasar.',
    bias: { pace: 10, dribbling: 4, shooting: -4, physical: -5, mental: -3, passing: -2 },
  },
  technician: {
    label: 'Teknisi',
    desc: 'Dribel dan umpan halus, fisik masih tipis.',
    bias: { dribbling: 8, passing: 6, mental: 2, shooting: -2, physical: -9, pace: -3 },
  },
  target: {
    label: 'Target Man',
    desc: 'Kuat menahan bola dan unggul di udara, lambat.',
    bias: { physical: 10, mental: 3, shooting: 2, pace: -9, dribbling: -5, passing: -1 },
  },
};

/** Laju pendekatan ke potensi per tahun (umur <= 27). */
export function growthRate(age: number): number {
  const t: Record<number, number> = { 16: 0.2, 17: 0.2, 18: 0.19, 19: 0.18, 20: 0.17, 21: 0.16, 22: 0.14, 23: 0.12, 24: 0.1, 25: 0.08, 26: 0.05, 27: 0.03 };
  return age < 16 ? 0.2 : (t[age] ?? 0);
}

/** Penurunan alami per tahun setelah puncak. */
export function declineRate(age: number): number {
  const t: Record<number, number> = { 28: 0, 29: -0.2, 30: -0.5, 31: -0.9, 32: -1.3, 33: -1.8, 34: -2.3, 35: -2.8 };
  return age <= 28 ? 0 : age > 35 ? -3.2 : t[age];
}

/** Dipanggil sekali tiap awal musim (setelah umur bertambah). */
export function ageProgress(h: Hero, gauss: () => number): void {
  const ovr = overallOf(h.attrs);
  const gap = Math.max(0, h.potential - ovr);
  const rate = growthRate(h.age);
  for (const k of ATTR_KEYS) {
    let d = rate > 0 ? gap * rate : declineRate(h.age);
    if (k === 'pace' && h.age >= 28) d -= 0.6 * (h.age - 27);
    if (k === 'physical' && h.age >= 30) d -= 0.4 * (h.age - 29);
    if (k === 'mental' && h.age <= 30) d += 0.35;
    if (k === 'mental' && h.age >= 31) d = Math.max(d, -0.3);
    d += gauss() * 0.7;
    h.attrs[k] = clamp(h.attrs[k] + d, 20, 97);
  }
  // potensi bergeser sedikit seiring waktu
  h.potential = clamp(Math.max(h.potential + gauss() * 1.2, overallOf(h.attrs)), 45, 96);
}

/** Tambahan poin saat latihan mingguan pada satu atribut. */
export function trainingGain(h: Hero, mult: number): number {
  const gap = Math.max(0, h.potential - overallOf(h.attrs));
  const base = Math.max(0.03, growthRate(h.age) * 0.5);
  return base * clamp(gap / 8, 0, 1.2) * mult;
}

/** Rating efektif dipakai untuk penilaian klub. */
export function effRating(h: Hero): number {
  const o = overallOf(h.attrs);
  const youthBonus = h.age < 24 ? (h.potential - o) * 0.35 : 0;
  return o + youthBonus + (h.fame - 30) * 0.05;
}

/** Nilai pasar (€K). */
export function heroValue(h: Hero): number {
  const e = effRating(h);
  let v = 25 * Math.exp((e - 40) * 0.1385);
  if (h.age >= 31) v *= 0.6;
  if (h.age >= 34) v *= 0.4;
  return Math.max(15, Math.round(v));
}

export function starsOfPotential(p: number): number {
  return clamp(Math.round((p - 55) / 8) + 1, 1, 5);
}
