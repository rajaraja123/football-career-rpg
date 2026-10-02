// Audit klasemen: cek invarian matematis (bukan cuma "kelihatan wajar").
import { createGame, choose } from '../src/engine/game';

const g = createGame({ name: 'B', archetype: 'finisher', clubId: 'mataram', seed: 777 });
// mainkan tepat 1 musim penuh (34 pekan) lewat jalur normal
let guard = 0;
while (g.week <= 34 && g.prompt.kind !== 'end' && guard++ < 20000) {
  const p = g.prompt;
  if (p.kind === 'moment') { let b = 0; p.choices.forEach((c, k) => { if (c.p > p.choices[b].p) b = k; }); choose(g, b); continue; }
  choose(g, 0);
}

const st = g.world.standings;
const clubs = g.world.clubs.map((c) => c.id);
let sumPld = 0, sumW = 0, sumD = 0, sumL = 0, sumPts = 0, sumGf = 0, sumGa = 0;
for (const id of clubs) {
  const s = st[id];
  sumPld += s.pld; sumW += s.w; sumD += s.d; sumL += s.l; sumPts += s.pts; sumGf += s.gf; sumGa += s.ga;
  const expectPts = s.w * 3 + s.d * 1;
  if (expectPts !== s.pts) console.log(`BUG poin: ${id} punya ${s.pts} poin, seharusnya ${expectPts} (dari ${s.w}M ${s.d}S ${s.l}K)`);
  if (s.w + s.d + s.l !== s.pld) console.log(`BUG total laga: ${id} pld=${s.pld} tapi W+D+L=${s.w + s.d + s.l}`);
}
console.log(`Klub: ${clubs.length} | Total pld (harus genap kelipatan jumlah klub): ${sumPld}`);
console.log(`Tiap klub seharusnya main ${(clubs.length - 1) * 2} laga. Pld per klub:`, clubs.map((id) => st[id].pld).join(','));
console.log(`sumW(${sumW}) harus == sumL(${sumL}):`, sumW === sumL);
console.log(`sumD(${sumD}) harus genap (tiap seri dihitung 2x):`, sumD % 2 === 0);
console.log(`sumGf(${sumGf}) harus == sumGa(${sumGa}):`, sumGf === sumGa);
console.log(`sumPts(${sumPts}) harus == 3*(sumW) + sumD:`, sumPts === 3 * sumW + sumD, `(${sumPts} vs ${3 * sumW + sumD})`);

// cek tiap fixture di jadwal benar-benar muncul persis 1x per klub per lawan (round-robin ganda: A-kandang-vs-B sekali, B-kandang-vs-A sekali)
const seen = new Map<string, number>();
for (const wk of g.world.schedule) for (const [hh, aa] of wk) {
  const k = `${hh}->${aa}`;
  seen.set(k, (seen.get(k) ?? 0) + 1);
  if (hh === aa) console.log('BUG: klub lawan diri sendiri', hh);
}
const dup = [...seen.entries()].filter(([, n]) => n !== 1);
console.log('Fixture yang muncul bukan tepat 1x (harus kosong):', dup);
console.log(`Total fixture di jadwal: ${g.world.schedule.flat().length} (harus ${clubs.length * (clubs.length - 1)})`);
