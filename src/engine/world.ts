import { CLUBS, LEAGUE_NAME } from '../data/clubs';
import { managerName, randomName } from '../data/names';
import { RNG } from './rng';
import { clamp } from './util';
import type { Club, Fixture, GameState, Manager, Player, Position, Standing, World } from './types';

export const clubLevel = (c: Club) => 55 + (c.reputation - 42) * 0.5;

export function newManager(rng: RNG): Manager {
  return {
    name: managerName(rng),
    style: rng.pick(['ofensif', 'defensif', 'seimbang'] as const),
    temper: rng.pick(['sabar', 'keras', 'seimbang'] as const),
  };
}

export function emptyStanding(): Standing {
  return { pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

/** Jadwal round-robin ganda (metode lingkaran). */
export function makeSchedule(ids: string[], rng: RNG): Fixture[][] {
  const teams = rng.shuffle(ids);
  const n = teams.length;
  const rounds: Fixture[][] = [];
  const arr = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const fx: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      fx.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(fx);
    arr.splice(1, 0, arr.pop()!);
  }
  const second = rounds.map((rd) => rd.map(([a, b]) => [b, a] as Fixture));
  return [...rounds, ...second];
}

const SLOTS: [Position, number][] = [['GK', 2], ['DF', 7], ['MF', 6], ['FW', 5]];

export function genPlayer(g: GameState, rng: RNG, club: Club, pos: Position, slot: number, opts: { age?: number } = {}): Player {
  const level = clubLevel(club);
  const age = opts.age ?? clamp(Math.round(rng.gauss(25, 4.2)), 17, 36);
  const slotDrop = pos === 'GK' ? slot * 9 : slot * 2.2;
  let overall = level + 3 - slotDrop + rng.gauss(0, 2.5);
  if (age < 21) overall -= (21 - age) * 3;
  if (age > 32) overall -= (age - 32) * 1.2;
  overall = clamp(Math.round(overall), 30, 90);
  const potential = clamp(Math.round(age < 26 ? overall + Math.max(0, rng.gauss((26 - age) * 1.8, 4)) : overall), overall, 95);
  const foreign = rng.chance(club.reputation > 60 ? 0.2 : 0.08);
  return { id: `p${g.world.nextId++}`, name: randomName(rng, foreign), age, pos, overall, potential, clubId: club.id, goals: 0 };
}

export function createWorld(g: GameState): World {
  const rng = new RNG(g);
  const world: World = { leagueName: LEAGUE_NAME, clubs: [], players: [], standings: {}, schedule: [], rivalId: null, nextId: 1 };
  g.world = world;
  for (const c of CLUBS) {
    const club: Club = {
      id: c.id, name: c.name, short: c.short, city: c.city,
      reputation: c.reputation, budget: c.budget, color: c.color, blurb: c.blurb,
      formation: rng.chance(0.5) ? 2 : 1,
      manager: newManager(rng),
      youthLevel: 0,
      youthNames: [],
    };
    club.youthLevel = Math.round(clubLevel(club) - 14 + rng.gauss(0, 2));
    club.youthNames = Array.from({ length: 12 }, () => randomName(rng));
    world.clubs.push(club);
    for (const [pos, n] of SLOTS) for (let i = 0; i < n; i++) world.players.push(genPlayer(g, rng, club, pos, i));
    world.standings[c.id] = emptyStanding();
  }
  world.schedule = makeSchedule(world.clubs.map((c) => c.id), rng);
  return world;
}

export const clubOf = (w: World, id: string) => w.clubs.find((c) => c.id === id)!;
export const squadOf = (w: World, clubId: string) => w.players.filter((p) => p.clubId === clubId);

const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 40);
const top = (a: number[], n: number) => [...a].sort((x, y) => y - x).slice(0, n);

/** Rating serang/bertahan tim. `heroOverall` diberikan jika pemain kita ikut main sebagai striker. */
export function teamRatings(g: GameState, clubId: string, youth: boolean, heroOverall?: number) {
  const club = clubOf(g.world, clubId);
  if (youth) return { atk: club.youthLevel + (heroOverall !== undefined ? 0 : 0), def: club.youthLevel };
  const sq = squadOf(g.world, clubId);
  const fw = sq.filter((p) => p.pos === 'FW').map((p) => p.overall);
  if (heroOverall !== undefined) fw.push(heroOverall);
  const mf = sq.filter((p) => p.pos === 'MF').map((p) => p.overall);
  const df = sq.filter((p) => p.pos === 'DF').map((p) => p.overall);
  const gk = sq.filter((p) => p.pos === 'GK').map((p) => p.overall);
  return {
    atk: 0.55 * avg(top(fw, 2)) + 0.45 * avg(top(mf, 3)),
    def: 0.65 * avg(top(df, 4)) + 0.35 * avg(top(gk, 1)),
  };
}

/** Rata-rata dua striker terbaik (dipakai untuk menilai peluang main / minat klub). */
export function strikerLevel(g: GameState, clubId: string): number {
  return avg(top(squadOf(g.world, clubId).filter((p) => p.pos === 'FW').map((p) => p.overall), 2));
}

function poisson(rng: RNG, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L && k < 12);
  return k - 1;
}

export function applyResult(w: World, home: string, away: string, hg: number, ag: number) {
  const h = w.standings[home];
  const a = w.standings[away];
  h.pld++; a.pld++;
  h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
  if (hg > ag) { h.w++; a.l++; h.pts += 3; }
  else if (hg < ag) { a.w++; h.l++; a.pts += 3; }
  else { h.d++; a.d++; h.pts++; a.pts++; }
}

function creditGoals(g: GameState, rng: RNG, clubId: string, n: number) {
  const sq = squadOf(g.world, clubId);
  for (let i = 0; i < n; i++) {
    const p = rng.weighted(sq, (x) => (x.pos === 'FW' ? 6 : x.pos === 'MF' ? 2.2 : x.pos === 'DF' ? 0.6 : 0.01) * Math.exp((x.overall - 60) / 25));
    p.goals++;
  }
}

/** Simulasi cepat satu pertandingan antar klub AI. */
export function quickSim(g: GameState, rng: RNG, homeId: string, awayId: string, youth: boolean) {
  const h = teamRatings(g, homeId, youth);
  const a = teamRatings(g, awayId, youth);
  const lh = 1.3 * Math.exp((h.atk + 2.5 - a.def) / 45);
  const la = 1.3 * Math.exp((a.atk - 2.5 - h.def) / 45);
  const hg = poisson(rng, lh);
  const ag = poisson(rng, la);
  if (!youth) {
    creditGoals(g, rng, homeId, hg);
    creditGoals(g, rng, awayId, ag);
  }
  applyResult(g.world, homeId, awayId, hg, ag);
  return { hg, ag };
}

export function sortedTable(w: World): { clubId: string; s: Standing }[] {
  return w.clubs
    .map((c) => ({ clubId: c.id, s: w.standings[c.id] }))
    .sort((x, y) => y.s.pts - x.s.pts || y.s.gf - y.s.ga - (x.s.gf - x.s.ga) || y.s.gf - x.s.gf || x.clubId.localeCompare(y.clubId));
}

export function resetSeason(g: GameState) {
  const rng = new RNG(g);
  const w = g.world;
  for (const c of w.clubs) w.standings[c.id] = emptyStanding();
  for (const p of w.players) p.goals = 0;
  w.schedule = makeSchedule(w.clubs.map((c) => c.id), rng);
}

/** Dipanggil tiap akhir musim: umur, progres, pensiun, regenerasi pemain AI. */
export function advanceWorld(g: GameState) {
  const rng = new RNG(g);
  const w = g.world;
  for (const p of w.players) {
    p.age++;
    const gap = p.potential - p.overall;
    let d: number;
    if (p.age <= 24) d = clamp(gap * 0.32, 0, 6) + rng.gauss(0, 1.2);
    else if (p.age <= 29) d = clamp(gap * 0.2, 0, 2) + rng.gauss(0, 1);
    else d = -(p.age - 29) * 0.75 + rng.gauss(0, 1);
    p.overall = clamp(Math.round(p.overall + d), 25, 94);
    if (p.potential < p.overall) p.potential = p.overall;
  }
  // pensiun + regen, jaga komposisi posisi tiap klub
  for (const c of w.clubs) {
    for (const [pos, n] of SLOTS) {
      let sq = w.players.filter((p) => p.clubId === c.id && p.pos === pos);
      sq = sq.filter((p) => {
        const retire = p.age >= 34 ? rng.chance(0.25 * (p.age - 33)) : p.age >= 31 && p.overall < clubLevel(c) - 12 && rng.chance(0.25);
        if (retire) {
          w.players.splice(w.players.indexOf(p), 1);
          if (w.rivalId === p.id) w.rivalId = null;
        }
        return !retire;
      });
      for (let i = sq.length; i < n; i++) {
        const y = genPlayer(g, rng, c, pos, n - 1, { age: rng.int(16, 20) });
        // regen: level dasar dekat kualitas klub, potensi bervariasi (kadang wonderkid)
        y.overall = clamp(Math.round(clubLevel(c) - 15 + rng.gauss(0, 3)), 28, 70);
        y.potential = clamp(Math.round(clubLevel(c) + rng.gauss(4, 7) + (rng.chance(0.06) ? 10 : 0)), y.overall, 93);
        w.players.push(y);
      }
    }
    // reputasi klub bergeser pelan
    c.reputation = clamp(Math.round(c.reputation + rng.gauss(0, 0.8)), 38, 85);
    c.youthLevel = Math.round(clubLevel(c) - 14 + rng.gauss(0, 2));
    c.youthNames = Array.from({ length: 12 }, () => randomName(rng));
  }
}
