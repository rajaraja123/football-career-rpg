// Audit realisme momen. Jalankan: npm run audit-moments
// Bagian A: nilai harapan tiap momen (peluang gol sendiri / gol dari assist) pada tiga level stat.
// Bagian B: pilihan yang terlalu mudah / hampir mustahil / tidak peduli stat.
// Bagian C: statistik per 90 menit dari simulasi karier sungguhan dibanding patokan sepak bola.
import { LATE_MOMENTS, MOMENTS, SHARED, SHOT_ACROBATIC, SHOT_FOOT, SHOT_HEAD } from '../src/data/moments';
import type { MChoice, MStep, Next } from '../src/data/moments';
import { ASSIST_SCALE, chanceOf, SHOT_BASE } from '../src/engine/match';
import { choose, createGame } from '../src/engine/game';

let DEF = 62; // kualitas bertahan lawan rata-rata liga
type V = { g: number; a: number };
type Pol = 'greedy' | 'mean';
const all = [...MOMENTS, ...LATE_MOMENTS];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const P = (L: number, ch: MChoice) => (ch.stat ? chanceOf(L, ch.diff ?? 55, DEF, false) : 1);

function evalNext(n: Next, tpl: string, L: number, pol: Pol): V {
  if ('step' in n) return evalStep(tpl, n.step, L, pol);
  if ('shot' in n) {
    const opts = n.kind === 'header' ? SHOT_HEAD : n.kind === 'acrobatic' ? SHOT_ACROBATIC : SHOT_FOOT;
    const ps = opts.map((o) => chanceOf(L, SHOT_BASE + o.diff + n.shot, DEF, false));
    return { g: pol === 'greedy' ? Math.max(...ps) : ps.reduce((s, v) => s + v, 0) / ps.length, a: 0 };
  }
  if ('assist' in n) return { g: 0, a: clamp(n.assist * ASSIST_SCALE * Math.exp(-(DEF - 58) / 60), 0.05, 0.8) };
  if ('end' in n) return { g: n.end === 'goal' ? 1 : 0, a: 0 };
  return { g: 0, a: 0 };
}
const memo = new Map<string, V>();
function evalStep(tpl: string, stepId: string, L: number, pol: Pol): V {
  const key = `${tpl}|${stepId}|${L}|${pol}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const t = all.find((x) => x.id === tpl)!;
  const st: MStep = t.steps[stepId] ?? SHARED[stepId];
  const vals = st.choices.map((ch) => {
    const p = P(L, ch);
    const ok = evalNext(ch.next, tpl, L, pol);
    const bad = evalNext(ch.failNext ?? { end: 'lost' }, tpl, L, pol);
    return { p, v: { g: p * ok.g + (1 - p) * bad.g, a: p * ok.a + (1 - p) * bad.a } };
  });
  let out: V;
  if (pol === 'greedy') out = vals.reduce((b, x) => (x.p > b.p ? x : b)).v;
  else out = { g: vals.reduce((s, x) => s + x.v.g, 0) / vals.length, a: vals.reduce((s, x) => s + x.v.a, 0) / vals.length };
  memo.set(key, out);
  return out;
}
const tplEV = (id: string, L: number, pol: Pol) => evalStep(id, all.find((t) => t.id === id)!.start, L, pol);

// ===== A. nilai harapan =====
const pool = MOMENTS.filter((t) => t.weight > 0);
const wsum = pool.reduce((s, t) => s + t.weight, 0);
console.log('=== A. Nilai harapan per momen (rata-rata berbobot, lawan bertahan ' + DEF + ') ===');
console.log('level stat | pilih paling aman (gol / assist->gol) | pilih acak (gol / assist->gol)');
for (const L of [55, 70, 85]) {
  const g1 = pool.reduce((s, t) => s + t.weight * tplEV(t.id, L, 'greedy').g, 0) / wsum;
  const a1 = pool.reduce((s, t) => s + t.weight * tplEV(t.id, L, 'greedy').a, 0) / wsum;
  const g2 = pool.reduce((s, t) => s + t.weight * tplEV(t.id, L, 'mean').g, 0) / wsum;
  const a2 = pool.reduce((s, t) => s + t.weight * tplEV(t.id, L, 'mean').a, 0) / wsum;
  console.log(`  stat ${L}   | ${(g1 * 100).toFixed(1)}% / ${(a1 * 100).toFixed(1)}%                     | ${(g2 * 100).toFixed(1)}% / ${(a2 * 100).toFixed(1)}%`);
}
const rows = pool.map((t) => ({ id: t.id, w: t.weight, g: tplEV(t.id, 70, 'greedy').g, a: tplEV(t.id, 70, 'greedy').a, gm: tplEV(t.id, 70, 'mean').g }));
console.log('\nMomen paling "gampang gol" (stat 70, pilih paling aman):');
for (const r of [...rows].sort((x, y) => y.g - x.g).slice(0, 8)) console.log(`  ${r.id.padEnd(24)} gol ${(r.g * 100).toFixed(0)}%  assist->gol ${(r.a * 100).toFixed(0)}%`);
console.log('Momen yang hampir tidak pernah berujung gol/assist (stat 70):');
for (const r of [...rows].sort((x, y) => x.g + x.a - (y.g + y.a)).slice(0, 8)) console.log(`  ${r.id.padEnd(24)} gol ${(r.g * 100).toFixed(1)}%  assist->gol ${(r.a * 100).toFixed(1)}%`);

// ===== B. pilihan bermasalah =====
for (const defQ of [50, 62, 75]) {
  DEF = defQ;
  console.log(`\n=== B. Pilihan bermasalah (lawan bertahan ${defQ}) ===`);
  const trivial: string[] = [], hard: string[] = [], flat: string[] = [], neverWork: string[] = [], alwaysWork: string[] = [];
  for (const t of all) {
    const seen = new Set<string>();
    const visit = (sid: string) => {
      if (seen.has(sid)) return;
      seen.add(sid);
      const st = t.steps[sid] ?? SHARED[sid];
      st.choices.forEach((ch, i) => {
        if (ch.stat) {
          const p70 = chanceOf(70, ch.diff ?? 55, DEF, false);
          const p20 = chanceOf(20, ch.diff ?? 55, DEF, false);
          const p97 = chanceOf(97, ch.diff ?? 55, DEF, false);
          const spread = chanceOf(85, ch.diff ?? 55, DEF, false) - chanceOf(55, ch.diff ?? 55, DEF, false);
          const tag = `[${t.id}/${sid}#${i + 1}] "${ch.label}"`;
          if (p70 > 0.93) trivial.push(`${tag} p70=${(p70 * 100).toFixed(0)}%`);
          if (p70 < 0.08) hard.push(`${tag} p70=${(p70 * 100).toFixed(0)}%`);
          if (spread < 0.12) flat.push(`${tag} beda ${(spread * 100).toFixed(0)} poin antara stat 55-85`);
          if (p97 < 0.15) neverWork.push(`${tag} p97=${(p97 * 100).toFixed(0)}% (mustahil walau stat maksimal)`);
          if (p20 > 0.5) alwaysWork.push(`${tag} p20=${(p20 * 100).toFixed(0)}% (gampang walau stat sangat rendah)`);
        }
        for (const n of [ch.next, ch.failNext]) if (n && 'step' in n) visit(n.step);
      });
    };
    visit(t.start);
  }
  const uniq = (a: string[]) => [...new Set(a)];
  console.log(`Terlalu mudah (>93% @stat70): ${uniq(trivial).length}`); uniq(trivial).slice(0, 6).forEach((x) => console.log('  ' + x));
  console.log(`Hampir mustahil (<8% @stat70): ${uniq(hard).length}`); uniq(hard).slice(0, 6).forEach((x) => console.log('  ' + x));
  console.log(`Stat nyaris tak berpengaruh: ${uniq(flat).length}`); uniq(flat).slice(0, 6).forEach((x) => console.log('  ' + x));
  console.log(`Mustahil walau stat 97 (maks): ${uniq(neverWork).length}`); uniq(neverWork).slice(0, 6).forEach((x) => console.log('  ' + x));
  console.log(`Gampang walau stat 20 (rookie): ${uniq(alwaysWork).length}`); uniq(alwaysWork).slice(0, 6).forEach((x) => console.log('  ' + x));
}
DEF = 62;

// ===== C. statistik dari simulasi sungguhan =====
console.log('\n=== C. Simulasi karier (starter, 60+ menit, level senior) ===');
const N = Number(process.argv[2] ?? 30);
// bot: latihan/event acak, 75% momen memilih opsi teraman (sama seperti scripts/simulate.ts)
function pick(g: ReturnType<typeof createGame>, rnd: () => number): number {
  const p = g.prompt;
  switch (p.kind) {
    case 'training': return Math.floor(rnd() * 6);
    case 'event': return Math.floor(rnd() * p.choices.length);
    case 'moment': {
      if (rnd() < 0.75) { let b = 0; p.choices.forEach((c, i) => { if (c.p > p.choices[b].p) b = i; }); return b; }
      return Math.floor(rnd() * p.choices.length);
    }
    case 'offers': return p.offers.length ? Math.floor(rnd() * p.offers.length) : 0;
    case 'retire': return p.canContinue ? 0 : 1;
    default: return 0;
  }
}
const acc = { n: 0, min: 0, goals: 0, assists: 0, shots: 0, rating: 0, zeroGoal: 0, multi: 0 };
const byOvr: Record<string, { n: number; min: number; goals: number; shots: number; assists: number }> = {};
for (let i = 0; i < N; i++) {
  const g = createGame({ name: 'B', archetype: ['finisher', 'speedster', 'technician', 'target'][i % 4], clubId: ['mataram', 'borneo', 'samudra', 'komodo', 'priangan'][i % 5], seed: 9000 + i });
  let guard = 0;
  let rs = 4321 + i;
  const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
  while (g.prompt.kind !== 'end' && guard++ < 60000) {
    const p = g.prompt;
    if (p.kind === 'info' && p.title === 'Ringkasan pertandingan' && g.hero.status === 'senior') {
      const m = p.lines[1].match(/Menit main: (\d+).*Gol: (\d+).*Assist: (\d+).*Tembakan: (\d+)/);
      const r = p.lines[2].match(/Rating pertandingan: ([\d.]+)/);
      if (m && r && Number(m[1]) >= 60) {
        const [min, goals, assists, shots] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
        acc.n++; acc.min += min; acc.goals += goals; acc.assists += assists; acc.shots += shots; acc.rating += Number(r[1]);
        if (goals === 0) acc.zeroGoal++;
        if (goals >= 2) acc.multi++;
        const ovr = Math.floor(Math.min(80, Math.max(55, g.hero.peakOverall)) / 5) * 5;
        const k = String(ovr);
        (byOvr[k] ??= { n: 0, min: 0, goals: 0, shots: 0, assists: 0 });
        byOvr[k].n++; byOvr[k].min += min; byOvr[k].goals += goals; byOvr[k].shots += shots; byOvr[k].assists += assists;
      }
    }
    choose(g, pick(g, rnd));
  }
}
const per90 = (v: number, min: number) => ((v / min) * 90).toFixed(2);
console.log(`laga starter dianalisis: ${acc.n}`);
console.log(`tembakan/90: ${per90(acc.shots, acc.min)} | gol/90: ${per90(acc.goals, acc.min)} | assist/90: ${per90(acc.assists, acc.min)} | konversi gol/tembakan: ${((acc.goals / acc.shots) * 100).toFixed(0)}%`);
console.log(`rating rata-rata: ${(acc.rating / acc.n).toFixed(2)} | laga tanpa gol: ${((acc.zeroGoal / acc.n) * 100).toFixed(0)}% | laga 2+ gol: ${((acc.multi / acc.n) * 100).toFixed(0)}%`);
console.log('per level (overall puncak pemain):');
for (const k of Object.keys(byOvr).sort()) { const b = byOvr[k]; console.log(`  ${k}-${Number(k) + 4}: gol/90 ${per90(b.goals, b.min)}  tembakan/90 ${per90(b.shots, b.min)}  assist/90 ${per90(b.assists, b.min)}  konversi ${((b.goals / b.shots) * 100).toFixed(0)}%  (${b.n} laga)`); }
console.log('\nPatokan kasar sepak bola sungguhan (striker utama liga papan atas): tembakan 2,5-4/90, konversi 10-18%, gol 0,35-0,5/90 (rata-rata) sampai 0,7-1,0/90 (elite), assist 0,10-0,25/90.');
