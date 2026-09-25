// RNG dengan seed (mulberry32). State disimpan di objek game (g.rng)
// supaya save/load selalu menghasilkan urutan acak yang sama.
export interface RngHolder {
  rng: number;
}

export class RNG {
  constructor(private h: RngHolder) {}

  next(): number {
    let t = (this.h.rng = (this.h.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min: number, max: number) {
    return min + (max - min) * this.next();
  }
  int(min: number, max: number) {
    return Math.floor(this.float(min, max + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  gauss(mean = 0, sd = 1) {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  weighted<T>(items: readonly T[], w: (t: T) => number): T {
    const total = items.reduce((s, i) => s + w(i), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= w(it);
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
