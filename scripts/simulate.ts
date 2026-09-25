// Simulasi otomatis untuk balancing: jalankan banyak karier tanpa UI.
//   npm run sim            -> 40 karier
//   npm run sim -- 200     -> 200 karier
import { ARCHETYPES, overallOf } from '../src/engine/player';
import { choose, createGame } from '../src/engine/game';
import type { GameState } from '../src/engine/types';

const N = Number(process.argv[2] ?? 40);
const archs = Object.keys(ARCHETYPES);

interface Row { age: number; n: number; ovr: number; apps: number; goals: number; assists: number; rating: number; pot: number }
const byAge: Record<number, Row> = {};
let retireAges: number[] = [];
let peaks: number[] = [];
let totalGoals: number[] = [];
let trophies: number[] = [];
let stuck = 0;

function pickChoice(g: GameState, rnd: () => number): number {
  const p = g.prompt;
  switch (p.kind) {
    case 'training': return Math.floor(rnd() * 6);
    case 'rehab': return 0;
    case 'event': return Math.floor(rnd() * p.choices.length);
    case 'moment': {
      // 75% ambil pilihan dengan peluang tertinggi, 25% acak
      if (rnd() < 0.75) {
        let best = 0;
        p.choices.forEach((c, i) => { if (c.p > p.choices[best].p) best = i; });
        return best;
      }
      return Math.floor(rnd() * p.choices.length);
    }
    case 'offers': return p.offers.length ? (rnd() < 0.5 ? 0 : Math.floor(rnd() * p.offers.length)) : 0;
    case 'retire': return p.canContinue ? 0 : 1;
    default: return 0;
  }
}

for (let i = 0; i < N; i++) {
  const g = createGame({ name: 'Bot', archetype: archs[i % archs.length], clubId: ['komodo', 'mataram', 'borneo', 'samudra', 'priangan'][i % 5], seed: 1000 + i });
  let rs = 1234 + i;
  const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
  let guard = 0;
  let lastSeason = 0;
  while (g.prompt.kind !== 'end' && guard++ < 60000) {
    const before = g.seasonNo;
    // catat statistik musim sebelum berganti musim
    if (g.stage === 'offseason' && g.osStep === 0 && g.prompt.kind === 'info' && g.hero.seasonsLog.length > lastSeason) {
      const r = g.hero.seasonsLog[g.hero.seasonsLog.length - 1];
      lastSeason = g.hero.seasonsLog.length;
      const row = (byAge[r.age] ??= { age: r.age, n: 0, ovr: 0, apps: 0, goals: 0, assists: 0, rating: 0, pot: 0 });
      row.n++; row.ovr += r.overall; row.apps += r.apps; row.goals += r.goals; row.assists += r.assists; row.rating += r.avgRating; row.pot += g.hero.potential;
    }
    choose(g, pickChoice(g, rnd));
    void before;
  }
  if (g.prompt.kind !== 'end') { stuck++; continue; }
  retireAges.push(g.hero.age);
  peaks.push(g.hero.peakOverall);
  totalGoals.push(g.hero.career.goals);
  trophies.push(g.hero.trophies.length);
}

const avg = (a: number[]) => (a.reduce((s, v) => s + v, 0) / Math.max(1, a.length)).toFixed(1);
console.log(`Karier selesai: ${N - stuck}/${N}`);
console.log(`Umur pensiun rata-rata: ${avg(retireAges)} | Overall puncak: ${avg(peaks)} | Gol karier: ${avg(totalGoals)} | Trofi: ${avg(trophies)}`);
console.log('umur  n   ovr   pot  laga  gol  ast  rating');
for (const r of Object.values(byAge).sort((a, b) => a.age - b.age)) {
  console.log(`${String(r.age).padStart(3)} ${String(r.n).padStart(3)} ${(r.ovr / r.n).toFixed(1).padStart(5)} ${(r.pot / r.n).toFixed(1).padStart(5)} ${(r.apps / r.n).toFixed(1).padStart(5)} ${(r.goals / r.n).toFixed(1).padStart(5)} ${(r.assists / r.n).toFixed(1).padStart(4)} ${(r.rating / r.n).toFixed(2).padStart(6)}`);
}
void overallOf;
