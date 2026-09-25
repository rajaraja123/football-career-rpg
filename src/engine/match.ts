import { LATE_MOMENTS, MOMENTS, SHARED, SHOT_ACROBATIC, SHOT_FOOT, SHOT_HEAD, SHOT_TEXT, type MChoice, type MStep, type Next, type ShotOption } from '../data/moments';
import { log } from './log';
import { overallOf } from './player';
import { RNG } from './rng';
import { clamp, r1, sigmoid } from './util';
import { applyResult, clubOf, squadOf, startingXI, teamRatings } from './world';
import type { Chance, Club, GameState, MatchState, MomentState, Prompt } from './types';

const SHOT_BASE = 87;
const STEP_BIAS = 4; // makin besar = aksi makin sulit secara umum
const ALL_TEMPLATES = [...MOMENTS, ...LATE_MOMENTS];
const BLOCKS = 18; // 18 blok x 5 menit

const heroClub = (g: GameState) => clubOf(g.world, g.hero.clubId);

export function fill(s: string, m: MatchState, mo: MomentState | null, opp: Club): string {
  return s
    .replaceAll('{mate}', mo?.mate ?? m.mates[0])
    .replaceAll('{def}', mo?.def ?? m.oppDef[0])
    .replaceAll('{gk}', mo?.gk ?? m.oppGK)
    .replaceAll('{opp}', opp.short);
}

// ---------- persiapan ----------

export function startMatch(g: GameState, oppId: string, home: boolean, starter: boolean): void {
  const rng = new RNG(g);
  const h = g.hero;
  const youth = h.status === 'academy';
  const us = heroClub(g);
  const opp = clubOf(g.world, oppId);
  const heroOvr = overallOf(h.attrs);

  const usR = teamRatings(g, us.id, youth, starter ? heroOvr : undefined);
  const themR = teamRatings(g, opp.id, youth);

  let mates: string[], oppAtk: string[], oppDef: string[], oppGK: string;
  if (youth) {
    mates = us.youthNames.slice(0, 8);
    oppAtk = opp.youthNames.slice(0, 6);
    oppDef = opp.youthNames.slice(6, 11);
    oppGK = opp.youthNames[11];
  } else {
    const sq = squadOf(g.world, us.id);
    const osq = squadOf(g.world, opp.id);
    mates = sq.filter((p) => p.pos === 'MF' || p.pos === 'FW').sort((a, b) => b.overall - a.overall).slice(0, 7).map((p) => p.name);
    oppAtk = osq.filter((p) => p.pos === 'MF' || p.pos === 'FW').sort((a, b) => b.overall - a.overall).slice(0, 6).map((p) => p.name);
    oppDef = osq.filter((p) => p.pos === 'DF').sort((a, b) => b.overall - a.overall).slice(0, 4).map((p) => p.name);
    oppGK = osq.filter((p) => p.pos === 'GK').sort((a, b) => b.overall - a.overall)[0].name;
  }

  let from = 0;
  let to = 90;
  if (starter) {
    if (rng.chance(0.4) || h.fitness < 55) to = rng.int(h.fitness < 55 ? 55 : 60, 86);
  } else {
    from = rng.int(52, 80);
  }

  // cedera
  let injured = false;
  let injuryWeeks = 0;
  const dur = to - from;
  const pInj = 0.018 * (dur / 90) * (1 + Math.max(0, 60 - h.fitness) / 50) * (1 + Math.max(0, 55 - h.attrs.physical) / 120);
  if (dur > 8 && rng.chance(pInj)) {
    injured = true;
    to = rng.int(from + 3, to - 1);
    const r = rng.next();
    injuryWeeks = r < 0.55 ? rng.int(1, 2) : r < 0.85 ? rng.int(3, 6) : r < 0.98 ? rng.int(8, 16) : rng.int(28, 40);
  }

  const lineupUs = youth
    ? []
    : (() => {
        const xi = starter ? startingXI(g, us.id, { name: g.hero.name, overall: heroOvr }) : startingXI(g, us.id);
        return [...xi.gk, ...xi.df, ...xi.mf, ...xi.fw];
      })();
  const lineupThem = youth ? [] : (() => { const xi = startingXI(g, opp.id); return [...xi.gk, ...xi.df, ...xi.mf, ...xi.fw]; })();

  const m: MatchState = {
    oppId, home, youth, block: 0, queue: [], score: { us: 0, them: 0 },
    from, to, starter, injured, injuryWeeks,
    ratings: { usAtk: usR.atk + (home ? 2.5 : -2.5), usDef: usR.def, themAtk: themR.atk + (home ? -2.5 : 2.5), themDef: themR.def },
    mates, oppAtk, oppDef, oppGK, lineupUs, lineupThem,
    goals: 0, assists: 0, shots: 0, moments: 0, rating: 6.0, moment: null, done: false,
  };
  g.match = m;

  const comp = youth ? ' (U-18)' : '';
  log(g, 'match', `${us.short} ${home ? 'vs' : '@'} ${opp.short}${comp}. ${home ? 'Kandang.' : 'Tandang.'}`, 'Kick-off');
  if (!youth) {
    const nm = (l: typeof lineupUs) => l.map((p) => p.name).join(', ');
    log(g, 'sys', `Susunan ${us.short} (${startingXI(g, us.id).formation}): ${nm(lineupUs)}.`);
    log(g, 'sys', `Susunan ${opp.short} (${startingXI(g, opp.id).formation}): ${nm(lineupThem)}.`);
  }
  if (starter) log(g, 'story', `Namamu ada di susunan pemain utama. Kamu berjalan ke lapangan bersama ${m.mates[0]} dan ${m.mates[1]}.`);
  else log(g, 'story', `Kamu duduk di bangku cadangan, memanaskan badan di pinggir lapangan.`);
}

// ---------- probabilitas ----------

function fitnessNow(g: GameState, m: MatchState, minute: number) {
  return g.hero.fitness - Math.max(0, minute - m.from) * 0.13;
}

function effStat(g: GameState, m: MatchState, stat: keyof typeof g.hero.attrs, minute: number): number {
  const h = g.hero;
  let v = h.attrs[stat];
  v += (h.form - 50) * 0.12 + (h.morale - 50) * 0.08;
  v -= Math.max(0, 60 - fitnessNow(g, m, minute)) * 0.25;
  if ((h.flags.hangover ?? 0) > g.t) v -= 4;
  return v;
}

export function pOf(g: GameState, m: MatchState, stat: keyof typeof g.hero.attrs, diff: number, minute: number): number {
  const opp = (m.ratings.themDef - 58) * 0.6 - (m.youth ? 12 : 0); // liga U-18 lebih mudah
  return clamp(sigmoid((effStat(g, m, stat, minute) - (diff + STEP_BIAS + opp)) / 13), 0.04, 0.96);
}

// ---------- simulasi blok ----------

const onPitch = (m: MatchState, minute: number) => minute >= m.from && minute < m.to;

function genBlock(g: GameState, m: MatchState, rng: RNG) {
  const start = m.block * 5;
  const us = heroClub(g);
  if (m.block === 0 && m.starter) log(g, 'match', 'Wasit meniup peluit. Pertandingan dimulai!', "0'");
  if (m.block === 9) log(g, 'match', `Turun minum. ${us.short} ${m.score.us}-${m.score.them} ${clubOf(g.world, m.oppId).short}.`, "45'");
  if (!m.starter && m.from >= start && m.from < start + 5) {
    log(g, 'story', `Papan pergantian menunjukkan nomormu. Kamu masuk menggantikan ${rng.pick(m.mates)}.`, `${m.from}'`);
  }
  if (m.to < 90 && m.to >= start && m.to < start + 5) {
    if (m.injured) log(g, 'bad', 'Kamu terjatuh dan memegangi kakimu. Tim medis berlari masuk. Kamu harus ditandu keluar.', `${m.to}'`);
    else log(g, 'story', `Kamu ditarik keluar, digantikan ${rng.pick(m.mates)}. Penonton bertepuk tangan.`, `${m.to}'`);
  }

  const chances: Chance[] = [];
  const pUs = clamp(0.66 * Math.exp((m.ratings.usAtk - m.ratings.themDef) / 60), 0.15, 1.3);
  const pThem = clamp(0.66 * Math.exp((m.ratings.themAtk - m.ratings.usDef) / 60), 0.15, 1.3);
  for (const [team, p] of [['us', pUs], ['them', pThem]] as const) {
    let n = Math.floor(p);
    if (rng.chance(p - n)) n++;
    for (let i = 0; i < n; i++) chances.push({ team, minute: start + rng.int(0, 4), kind: 'chance' });
  }
  if (rng.chance(0.05)) chances.push({ team: 'us', minute: start + rng.int(0, 4), kind: 'press' });
  chances.sort((a, b) => a.minute - b.minute);
  m.queue.push(...chances);
  m.block++;
}

function teamGoal(g: GameState, m: MatchState, team: 'us' | 'them', minute: number, scorer: string) {
  const us = heroClub(g);
  const opp = clubOf(g.world, m.oppId);
  if (team === 'us') m.score.us++;
  else m.score.them++;
  const text = team === 'us'
    ? `GOL untuk ${us.short}! ${scorer} mencetak gol. ${us.short} ${m.score.us}-${m.score.them} ${opp.short}.`
    : `Gol untuk ${opp.short}. ${scorer} membobol gawang. ${us.short} ${m.score.us}-${m.score.them} ${opp.short}.`;
  log(g, team === 'us' ? 'goal' : 'bad', text, `${minute}'`);
}

function heroGoal(g: GameState, m: MatchState, minute: number) {
  m.goals++;
  m.rating += 0.9;
  teamGoal(g, m, 'us', minute, g.hero.name);
}

export function advanceMatch(g: GameState): void {
  const rng = new RNG(g);
  const m = g.match!;
  const opp = clubOf(g.world, m.oppId);
  while (true) {
    if (m.queue.length === 0) {
      if (m.block >= BLOCKS) {
        m.done = true;
        return;
      }
      genBlock(g, m, rng);
      continue;
    }
    const c = m.queue.shift()!;
    const heroHere = onPitch(m, c.minute);

    if (c.team === 'them') {
      const conv = clamp(0.1 * Math.exp((m.ratings.themAtk - m.ratings.usDef) / 70), 0.03, 0.3);
      if (rng.chance(conv)) teamGoal(g, m, 'them', c.minute, rng.pick(m.oppAtk));
      continue;
    }

    if (c.kind === 'press') {
      if (heroHere) return openMoment(g, m, rng, 'press', c.minute);
      continue;
    }

    const involve = (m.starter ? 0.34 : 0.49) * (1 + (g.hero.form - 50) / 250);
    if (heroHere && rng.chance(involve)) {
      let id: string;
      if (rng.chance(0.04) && g.hero.role !== 'prospect' && !m.youth) id = 'penalty';
      else if (c.minute >= 85 && !m.youth && Math.abs(m.score.us - m.score.them) <= 1 && rng.chance(0.22)) id = rng.pick(LATE_MOMENTS).id;
      else id = pickTemplate(g, rng);
      return openMoment(g, m, rng, id, c.minute);
    }
    const conv = clamp(0.1 * Math.exp((m.ratings.usAtk - m.ratings.themDef) / 70), 0.03, 0.3);
    if (rng.chance(conv)) teamGoal(g, m, 'us', c.minute, rng.pick(m.mates));
  }
  void opp;
}

function pickTemplate(g: GameState, rng: RNG): string {
  const pool = MOMENTS.filter((t) => t.weight > 0);
  return rng.weighted(pool, (t) => t.weight * (t.tags?.includes(g.hero.archetype) ? 1.8 : 1)).id;
}

const findTpl = (id: string) => ALL_TEMPLATES.find((t) => t.id === id)!;

function openMoment(g: GameState, m: MatchState, rng: RNG, templateId: string, minute: number) {
  const tpl = findTpl(templateId);
  m.moments++;
  m.moment = {
    templateId, stepId: tpl.start, minute,
    mate: rng.pick(m.mates), def: rng.pick(m.oppDef), gk: m.oppGK,
    shotMod: 0, shotKind: 'foot', mode: 'steps', ok: 0,
  };
  g.prompt = momentPrompt(g);
}

// ---------- prompt & resolusi momen ----------

function stepOf(mo: MomentState): MStep {
  const tpl = findTpl(mo.templateId);
  return tpl.steps[mo.stepId] ?? SHARED[mo.stepId];
}
const shotOptions = (mo: MomentState): ShotOption[] =>
  mo.shotKind === 'header' ? SHOT_HEAD : mo.shotKind === 'acrobatic' ? SHOT_ACROBATIC : SHOT_FOOT;

export function momentPrompt(g: GameState): Prompt {
  const m = g.match!;
  const mo = m.moment!;
  const opp = clubOf(g.world, m.oppId);
  const tpl = findTpl(mo.templateId);
  if (mo.mode === 'shot') {
    const shotText = mo.shotKind === 'header'
      ? `Bola melayang ke kepalamu. ${fill('{gk}', m, mo, opp)} ada di bawah mistar.`
      : mo.shotKind === 'acrobatic'
      ? `Bola melayang tinggi, tidak ada waktu mengontrolnya dengan normal. ${fill('{gk}', m, mo, opp)} menunggu di bawah mistar.`
      : `Gawang terbuka di depanmu, ${fill('{gk}', m, mo, opp)} bersiap. Ke mana kamu mengarahkan bola?`;
    return {
      kind: 'moment',
      title: 'Saatnya menembak!',
      text: shotText,
      minute: mo.minute,
      choices: shotOptions(mo).map((o) => ({ label: o.label, p: pOf(g, m, o.stat, SHOT_BASE + o.diff + mo.shotMod, mo.minute) })),
    };
  }
  const step = stepOf(mo);
  return {
    kind: 'moment',
    title: tpl.title,
    text: fill(step.text, m, mo, opp),
    minute: mo.minute,
    choices: step.choices.map((c) => ({
      label: fill(c.label, m, mo, opp),
      p: c.stat ? pOf(g, m, c.stat, c.diff ?? 55, mo.minute) : -1,
    })),
  };
}

function endMoment(g: GameState, m: MatchState) {
  m.moment = null;
}

export function resolveMoment(g: GameState, idx: number): void {
  const rng = new RNG(g);
  const m = g.match!;
  const mo = m.moment!;
  const opp = clubOf(g.world, m.oppId);
  const f = (s: string) => fill(s, m, mo, opp);
  const min = mo.minute;
  const tag = `${min}'`;

  if (mo.mode === 'shot') {
    const o = shotOptions(mo)[idx];
    const p = pOf(g, m, o.stat, SHOT_BASE + o.diff + mo.shotMod, min);
    m.shots++;
    if (rng.chance(p)) {
      log(g, 'story', `Kamu menembak: ${o.label.toLowerCase()}.`, tag);
      heroGoal(g, m, min);
      log(g, 'good', f(rng.pick(SHOT_TEXT.goal)), tag);
    } else {
      const kind = rng.weighted(Object.entries(o.fails), ([, w]) => w)[0] as keyof typeof SHOT_TEXT;
      log(g, 'story', `Kamu menembak: ${o.label.toLowerCase()}.`, tag);
      log(g, 'bad', f(rng.pick(SHOT_TEXT[kind])), tag);
      m.rating += kind === 'saved' || kind === 'post' ? 0.15 : -0.05;
    }
    return endMoment(g, m);
  }

  const step = stepOf(mo);
  const c: MChoice = step.choices[idx];
  let ok = true;
  if (c.stat) {
    ok = rng.chance(pOf(g, m, c.stat, c.diff ?? 55, min));
    m.rating += ok ? 0.1 : -0.1;
  }
  if (ok) mo.ok++;
  log(g, ok ? 'story' : 'bad', f(ok ? c.ok : c.fail ?? 'Percobaanmu gagal.'), tag);
  const next: Next = ok ? c.next : c.failNext ?? { end: 'lost' };
  applyNext(g, m, mo, next, rng, tag);
}

function applyNext(g: GameState, m: MatchState, mo: MomentState, next: Next, rng: RNG, tag: string) {
  const opp = clubOf(g.world, m.oppId);
  const f = (s: string) => fill(s, m, mo, opp);
  if ('step' in next) {
    mo.stepId = next.step;
    g.prompt = momentPrompt(g);
    return;
  }
  if ('shot' in next) {
    mo.mode = 'shot';
    mo.shotMod = next.shot;
    mo.shotKind = next.kind ?? 'foot';
    g.prompt = momentPrompt(g);
    return;
  }
  if ('assist' in next) {
    const p = clamp(next.assist * Math.exp(-(m.ratings.themDef - 58) / 60) + (g.hero.rel.team - 50) * 0.0015, 0.05, 0.8);
    if (rng.chance(p)) {
      m.assists++;
      m.rating += 0.7;
      teamGoal(g, m, 'us', mo.minute, mo.mate);
      log(g, 'good', f(`Assist! {mate} menuntaskan umpanmu dengan tenang.`), tag);
    } else {
      m.rating += 0.05;
      log(g, 'bad', f(rng.pick(['{mate} menembak, tapi {gk} menepisnya!', '{mate} tergesa-gesa dan bola melebar.', 'Tembakan {mate} diblok {def}.'])), tag);
    }
    return endMoment(g, m);
  }
  if ('foul' in next) {
    m.rating += 0.15;
    const cardChance = next.foul === 'hard' ? 0.55 : 0.18;
    if (rng.chance(cardChance)) {
      const isRed = next.foul === 'hard' && rng.chance(0.2);
      log(g, isRed ? 'good' : 'story', f(`Wasit mengeluarkan kartu ${isRed ? 'MERAH' : 'kuning'} untuk {def}!${isRed ? ' Lawan harus bermain dengan 10 orang sisa pertandingan.' : ''}`), tag);
      if (isRed) {
        m.ratings.themDef = Math.max(30, m.ratings.themDef - 10);
        m.ratings.themAtk = Math.max(30, m.ratings.themAtk - 6);
      }
    } else {
      log(g, 'story', f('Wasit meniup peluit, pelanggaran untuk timmu. Tendangan bebas.'), tag);
    }
    return endMoment(g, m);
  }
  switch (next.end) {
    case 'goal':
      heroGoal(g, m, mo.minute);
      log(g, 'good', f(rng.pick(SHOT_TEXT.goal)), tag);
      break;
    case 'miss':
      m.rating -= 0.3;
      m.shots++;
      break;
    case 'lost':
      m.rating -= 0.1;
      break;
    case 'win':
      m.rating += 0.25;
      break;
    case 'control':
      m.rating += 0.1;
      break;
    default:
      break;
  }
  endMoment(g, m);
}

// ---------- penutup ----------

export function finishMatch(g: GameState): { lines: string[]; title: string } {
  const rng = new RNG(g);
  const h = g.hero;
  const m = g.match!;
  const us = heroClub(g);
  const opp = clubOf(g.world, m.oppId);
  const res = m.score.us - m.score.them;
  const minutes = Math.max(0, m.to - m.from);

  const rating = clamp(m.rating + (res > 0 ? 0.35 : res < 0 ? -0.25 : 0.05) + rng.gauss(0, 0.2), 3, 10);
  const played = minutes > 0;

  const homeId = m.home ? us.id : opp.id;
  const awayId = m.home ? opp.id : us.id;
  applyResult(g.world, homeId, awayId, m.home ? m.score.us : m.score.them, m.home ? m.score.them : m.score.us);

  for (const s of [h.season, h.career]) {
    s.apps++;
    if (m.starter) s.starts++;
    s.minutes += minutes;
    s.goals += m.goals;
    s.assists += m.assists;
    s.ratingSum += rating;
  }

  h.fitness = clamp(h.fitness - (minutes / 90) * 14, 5, 100);
  h.form = clamp(h.form + (rating - 6.4) * 7, 5, 95);
  h.morale = clamp(h.morale + (res > 0 ? 3 : res < 0 ? -3 : 0) + m.goals * 3, 0, 100);
  h.rel.manager = clamp(h.rel.manager + (rating - 6.5) * 1.6, 0, 100);
  h.rel.fans = clamp(h.rel.fans + m.goals * 1.2 + (rating - 6.5) * 0.5, 0, 100);
  if (!m.youth) {
    h.fame = clamp(h.fame + m.goals * 0.8 + (rating >= 8 ? 0.8 : 0) + (m.starter ? 0.05 : 0), 0, 100);
    h.rel.media = clamp(h.rel.media + (m.goals > 0 ? 1 : 0) + (rating < 5.5 ? -1 : 0), 0, 100);
  }
  h.notPlayedStreak = 0;
  if (m.starter || minutes >= 30) {
    if (m.goals > 0) {
      h.goalDrought = 0;
      h.goalStreak++;
    } else {
      h.goalDrought++;
      h.goalStreak = 0;
    }
  }
  if (m.injured) {
    h.injuryWeeks = m.injuryWeeks;
    log(g, 'bad', `Hasil pemeriksaan: kamu cedera dan harus absen sekitar ${m.injuryWeeks} pekan.`);
  }

  const outcome = res > 0 ? 'Menang' : res < 0 ? 'Kalah' : 'Imbang';
  log(g, 'match', `Peluit panjang. ${us.short} ${m.score.us}-${m.score.them} ${opp.short}. ${outcome}.`, "90'");

  const lines: string[] = [
    `${us.short} ${m.score.us}-${m.score.them} ${opp.short}  (${outcome})`,
    `Menit main: ${minutes}  ·  Gol: ${m.goals}  ·  Assist: ${m.assists}  ·  Tembakan: ${m.shots}`,
    `Rating pertandingan: ${r1(rating)}`,
  ];
  if (rating >= 8.5) lines.push('Kamu dinobatkan sebagai pemain terbaik pertandingan.');
  else if (rating < 5.2 && played) lines.push('Malam yang berat. Kamu kesulitan mengikuti tempo pertandingan.');
  if (m.goals >= 3) lines.push('Hat-trick! Nama kamu akan ada di semua headline besok.');
  if (!played) lines.push('Kamu tidak sempat masuk lapangan.');

  g.match = null;
  return { lines, title: 'Ringkasan pertandingan' };
}
