import { ARCHETYPES, ATTR_KEYS, ATTR_LABEL, ageProgress, effRating, overallOf, trainingGain } from './player';
import { applyFx, openEvent, pickEvent, resolveEvent } from './events';
import { advanceMatch, finishMatch, resolveMoment, startMatch } from './match';
import { acceptOffer, makeOffers, offerLine, type OfferMode } from './transfer';
import { log } from './log';
import { RNG } from './rng';
import { clamp, money, r1 } from './util';
import { advanceWorld, clubLevel, clubOf, createWorld, genPlayer, quickSim, resetSeason, sortedTable, squadOf, strikerLevel } from './world';
import type { Attrs, GameState, Hero, Offer, Prompt, SeasonStats } from './types';

const emptyStats = (): SeasonStats => ({ apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, ratingSum: 0 });
const START_YEAR = 2026;

export interface NewGameOpts {
  name: string;
  archetype: string;
  clubId: string;
  seed?: number;
}

export const seasonLabel = (g: GameState) => `${START_YEAR + g.seasonNo - 1}/${String((START_YEAR + g.seasonNo) % 100).padStart(2, '0')}`;

// ======================= pembuatan game =======================

export function createGame(o: NewGameOpts): GameState {
  const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
  const g = {
    v: 1, rng: seed, seasonNo: 1, startYear: START_YEAR, week: 1, t: 0, stage: 'weekStart',
    world: null as never, hero: null as never, log: [], prompt: { kind: 'training' } as Prompt,
    match: null, heroPlayedThisWeek: false, eventMap: [], eventId: null, osStep: 0, offerMode: null,
    lastEventT: -5, history: [],
  } as GameState;
  const rng = new RNG(g);
  createWorld(g);
  const club = clubOf(g.world, o.clubId);

  // pemain
  const arch = ARCHETYPES[o.archetype] ?? ARCHETYPES.finisher;
  const base = rng.int(42, 50);
  const attrs = {} as Attrs;
  for (const k of ATTR_KEYS) attrs[k] = clamp(base + arch.bias[k] + rng.gauss(0, 2.5), 25, 80);
  const potential = clamp(Math.round(rng.gauss(76, 8)), 58, 93);
  const hero: Hero = {
    name: o.name.trim() || 'Raja', age: 16, archetype: o.archetype in ARCHETYPES ? o.archetype : 'finisher', attrs, potential,
    clubId: club.id, status: 'academy', role: 'prospect', contract: { salary: 0.6, yearsLeft: 2 },
    fitness: 100, form: 50, morale: 62, injuryWeeks: 0, money: 2, fame: 1,
    rel: { manager: 50, team: 50, fans: 25, media: 20, agent: 40 },
    season: emptyStats(), career: emptyStats(), seasonsLog: [], trophies: [], caps: 0, capGoals: 0,
    transferRequested: false, flags: {}, sched: [], done: [], cooldown: {},
    notPlayedStreak: 0, goalDrought: 0, goalStreak: 0, peakOverall: 0, weeklyGain: '',
  };
  hero.peakOverall = overallOf(attrs);
  g.hero = hero;

  // rival: striker muda dari klub lain
  const others = g.world.clubs.filter((c) => c.id !== club.id);
  const rc = rng.pick(others);
  const rival = genPlayer(g, rng, rc, 'FW', 2, { age: rng.int(16, 17) });
  rival.overall = clamp(hero.peakOverall + rng.int(-3, 4), 38, 60);
  rival.potential = clamp(Math.round(potential + rng.gauss(2, 5)), rival.overall, 94);
  const weakest = squadOf(g.world, rc.id).filter((p) => p.pos === 'FW').sort((a, b) => a.overall - b.overall)[0];
  g.world.players.splice(g.world.players.indexOf(weakest), 1);
  g.world.players.push(rival);
  g.world.rivalId = rival.id;

  log(g, 'story', `Kamu ${hero.name}, 16 tahun, striker muda yang baru diterima di akademi ${club.name}, ${club.city}.`);
  log(g, 'story', `Pelatih akademi menilaimu sebagai tipe ${arch.label.toLowerCase()}. ${arch.desc}`);
  log(g, 'story', `Di tribun pemain muda, kamu mendengar nama seseorang yang sering disebut: ${rival.name}, striker muda ${rc.short} yang seumuranmu. Kamu punya firasat kalian akan sering bertemu.`);
  g.prompt = {
    kind: 'info', title: `Selamat datang di ${club.short}`,
    lines: [
      `Kamu akan bermain di Liga U-18 sampai umur 17-18 tahun, lalu berjuang mendapat kontrak profesional.`,
      `Tiap pekan: pilih fokus latihan, hadapi kejadian di luar lapangan, lalu bermain. Di pertandingan, kamu akan ikut menentukan momen-momen kunci.`,
    ],
    button: 'Mulai musim pertama',
  };
  return g;
}

// ======================= input pemain =======================

export function choose(g: GameState, idx: number): void {
  const p = g.prompt;
  switch (p.kind) {
    case 'training': doTraining(g, idx); break;
    case 'rehab': doRehab(g, idx); break;
    case 'event': resolveEvent(g, idx); g.stage = 'preMatch'; break;
    case 'moment':
      resolveMoment(g, idx);
      if (g.match && g.match.moment) return; // masih di momen yang sama (langkah berikutnya)
      break;
    case 'info': break;
    case 'offers': handleOffer(g, idx); break;
    case 'retire': handleRetire(g, idx); break;
    case 'end': return;
  }
  run(g);
}

/** Aksi di luar alur utama (menu tindakan). */
export function act(g: GameState, action: 'requestTransfer' | 'cancelRequest'): void {
  const h = g.hero;
  if (h.status !== 'senior') return;
  if (action === 'requestTransfer' && !h.transferRequested) {
    h.transferRequested = true;
    h.rel.manager = clamp(h.rel.manager - 8, 0, 100);
    h.morale = clamp(h.morale - 2, 0, 100);
    log(g, 'story', 'Kamu meminta agen mencarikan klub baru. Kabar itu cepat menyebar di ruang ganti. Peluang pindah terbuka di bursa transfer berikutnya.');
  } else if (action === 'cancelRequest' && h.transferRequested) {
    h.transferRequested = false;
    h.rel.manager = clamp(h.rel.manager + 3, 0, 100);
    log(g, 'story', 'Kamu menarik permintaan pindahmu dan berkata siap berjuang di klub ini.');
  }
}

// ======================= mesin tahap =======================

function run(g: GameState) {
  for (let guard = 0; guard < 80; guard++) {
    if (step(g)) return;
  }
}

function step(g: GameState): boolean {
  switch (g.stage) {
    case 'weekStart': return stageWeekStart(g);
    case 'weekEvent': return stageWeekEvent(g);
    case 'preMatch': return stagePreMatch(g);
    case 'inMatch': return stageInMatch(g);
    case 'matchDone': return stageMatchDone(g);
    case 'weekEnd': return stageWeekEnd(g);
    case 'window': return stageWindow(g);
    case 'seasonEnd': return stageSeasonEnd(g);
    case 'offseason': return stageOffseason(g);
    case 'retired': return true;
  }
}

const info = (title: string, lines: string[], button = 'Lanjut'): Prompt => ({ kind: 'info', title, lines, button });

function stageWeekStart(g: GameState): boolean {
  const h = g.hero;
  log(g, 'week', `Pekan ${g.week}`, `Musim ${seasonLabel(g)}`);
  g.prompt = h.injuryWeeks > 0 ? { kind: 'rehab' } : { kind: 'training' };
  return true;
}

function doTraining(g: GameState, idx: number) {
  const h = g.hero;
  const has = (f: string) => (h.flags[f] ?? 0) > g.t;
  if (idx >= ATTR_KEYS.length) {
    h.fitness = clamp(h.fitness + 26, 0, 100);
    h.morale = clamp(h.morale + 2, 0, 100);
    log(g, 'sys', 'Pekan ini kamu memilih memulihkan tenaga: tidur cukup, pijat, dan makan teratur.');
  } else {
    const key = ATTR_KEYS[idx];
    let mult = 1;
    if (has('mentor')) mult *= 1.5;
    if (has('trainer') && (key === 'shooting' || key === 'dribbling')) mult *= 1.5;
    if (has('hangover')) mult *= 0.5;
    if (h.rel.manager >= 70) mult *= 1.1;
    if (h.morale < 30) mult *= 0.8;
    const gain = trainingGain(h, mult);
    h.attrs[key] = clamp(h.attrs[key] + gain, 20, 97);
    h.fitness = clamp(h.fitness - 4, 0, 100);
    log(g, 'sys', `Latihan fokus ${ATTR_LABEL[key].toLowerCase()}: +${gain.toFixed(2)}${has('mentor') ? ' (dibimbing kapten)' : ''}`);
  }
  const o = overallOf(h.attrs);
  if (o > h.peakOverall) h.peakOverall = o;
  g.stage = 'weekEvent';
}

function doRehab(g: GameState, idx: number) {
  const h = g.hero;
  const rng = new RNG(g);
  if (idx === 0) {
    if (rng.chance(0.15)) {
      h.injuryWeeks += 1;
      log(g, 'bad', 'Rehabilitasi terlalu keras, ada sedikit kemunduran. Pemulihan mundur seminggu.');
    } else {
      h.injuryWeeks = Math.max(1, h.injuryWeeks - 1);
      log(g, 'good', 'Rehabilitasi ketatmu berjalan lancar. Pemulihan lebih cepat dari jadwal.');
    }
  } else {
    log(g, 'sys', 'Kamu menjalani program pemulihan standar dari tim medis.');
  }
  g.stage = 'weekEvent';
}

function stageWeekEvent(g: GameState): boolean {
  const rng = new RNG(g);
  const ev = pickEvent(g, rng);
  if (!ev) {
    g.stage = 'preMatch';
    return false;
  }
  openEvent(g, ev);
  return true;
}

function selection(g: GameState, rng: RNG): 'starter' | 'sub' | 'out' {
  const h = g.hero;
  if (h.status === 'academy') return h.fitness < 40 || rng.chance(0.08) ? 'sub' : 'starter';
  const club = clubOf(g.world, h.clubId);
  const roleBonus = h.role === 'starter' ? 4 : h.role === 'rotation' ? 1 : -2;
  const score = overallOf(h.attrs) + (h.form - 50) * 0.12 + (h.rel.manager - 50) * 0.08 + roleBonus + rng.gauss(0, 2) - (h.fitness < 50 ? 4 : 0);
  const fw = squadOf(g.world, club.id).filter((p) => p.pos === 'FW').map((p) => p.overall + rng.gauss(0, 2));
  const rank = fw.filter((v) => v > score).length;
  if (rank < club.formation) return 'starter';
  if (rank === club.formation) return rng.chance(0.75) ? 'sub' : 'out';
  if (rank === club.formation + 1) return rng.chance(0.3) ? 'sub' : 'out';
  return rng.chance(0.15) ? 'sub' : 'out';
}

function stagePreMatch(g: GameState): boolean {
  const rng = new RNG(g);
  const h = g.hero;
  const fx = g.world.schedule[g.week - 1].find((f) => f.includes(h.clubId))!;
  const home = fx[0] === h.clubId;
  const oppId = home ? fx[1] : fx[0];
  g.heroPlayedThisWeek = false;

  if (h.injuryWeeks > 0) {
    log(g, 'bad', `Kamu absen pekan ini karena cedera (${h.injuryWeeks} pekan lagi).`);
    h.notPlayedStreak++;
    g.stage = 'weekEnd';
    return false;
  }
  const sel = selection(g, rng);
  if (sel === 'out') {
    const opp = clubOf(g.world, oppId);
    log(g, 'bad', `Namamu tidak masuk daftar 18 pemain untuk laga melawan ${opp.short}. Kamu menonton dari tribun.`);
    h.notPlayedStreak++;
    h.morale = clamp(h.morale - 2, 0, 100);
    if (h.notPlayedStreak >= 3) h.rel.manager = clamp(h.rel.manager - 1, 0, 100);
    g.stage = 'weekEnd';
    return false;
  }
  startMatch(g, oppId, home, sel === 'starter');
  g.stage = 'inMatch';
  return false;
}

function stageInMatch(g: GameState): boolean {
  advanceMatch(g);
  const m = g.match!;
  if (m.moment) return true; // prompt sudah diset engine
  g.stage = 'matchDone';
  return false;
}

function stageMatchDone(g: GameState): boolean {
  const r = finishMatch(g);
  g.heroPlayedThisWeek = true;
  g.prompt = info(r.title, r.lines, 'Lanjut');
  g.stage = 'weekEnd';
  return true;
}

function stageWeekEnd(g: GameState): boolean {
  const rng = new RNG(g);
  const h = g.hero;
  const youth = h.status === 'academy';
  for (const f of g.world.schedule[g.week - 1]) {
    const mine = f.includes(h.clubId);
    if (mine && g.heroPlayedThisWeek) continue;
    const r = quickSim(g, rng, f[0], f[1], youth);
    if (mine) {
      const home = f[0] === h.clubId;
      const us = home ? r.hg : r.ag;
      const them = home ? r.ag : r.hg;
      const opp = clubOf(g.world, home ? f[1] : f[0]);
      log(g, 'match', `${clubOf(g.world, h.clubId).short} ${us}-${them} ${opp.short}. ${us > them ? 'Menang' : us < them ? 'Kalah' : 'Imbang'}.`);
    }
  }
  g.heroPlayedThisWeek = false;

  // pemulihan & waktu berjalan
  h.fitness = clamp(h.fitness + (h.injuryWeeks > 0 ? 8 : 14), 0, 100);
  h.form += (50 - h.form) * 0.1;
  h.morale += (55 - h.morale) * 0.05;
  if (h.injuryWeeks > 0) {
    h.injuryWeeks--;
    if (h.injuryWeeks === 0) log(g, 'good', 'Kamu dinyatakan pulih dan boleh berlatih penuh lagi.');
  }
  h.money += h.contract.salary / 4;
  g.week++;
  g.t++;
  if (g.week > 34) g.stage = 'seasonEnd';
  else if (g.week === 18 && h.status === 'senior') g.stage = 'window';
  else g.stage = 'weekStart';
  return false;
}

// ======================= transfer =======================

function offersPrompt(g: GameState, mode: OfferMode, offers: Offer[]): Prompt {
  g.offerMode = mode;
  const own = clubOf(g.world, g.hero.clubId);
  const titles: Record<OfferMode, [string, string]> = {
    window: ['Tawaran transfer', 'Beberapa klub tertarik dan manajemen menerima tawaran mereka. Keputusan ada di tanganmu.'],
    free: ['Kontrakmu habis', `Kontrak di ${own.short} berakhir. Kamu bebas memilih klub berikutnya.`],
    academy: ['Kontrak profesional pertama', 'Usiamu sudah cukup untuk masuk dunia profesional. Ini tawaran yang masuk.'],
    promo: ['Promosi ke tim utama?', `Performamu menarik perhatian tim utama ${own.short}. Mau naik lebih cepat?`],
  };
  return {
    kind: 'offers', title: titles[mode][0], text: titles[mode][1], offers,
    canStay: mode === 'window' || mode === 'promo',
    stayLabel: mode === 'promo' ? 'Tetap di akademi satu musim lagi' : `Bertahan di ${own.short}`,
  };
}

function stageWindow(g: GameState): boolean {
  const h = g.hero;
  g.stage = 'weekStart';
  const offers = makeOffers(g, 'window');
  if (offers.length === 0) {
    if (h.transferRequested) log(g, 'story', 'Agenmu belum menemukan klub yang cocok pada bursa transfer kali ini.');
    return false;
  }
  log(g, 'event', 'Bursa transfer paruh musim dibuka. Agenmu mengabarkan ada tawaran masuk.');
  g.prompt = offersPrompt(g, 'window', offers);
  return true;
}

function handleOffer(g: GameState, idx: number) {
  const p = g.prompt;
  if (p.kind !== 'offers') return;
  if (idx >= p.offers.length) {
    log(g, 'story', g.offerMode === 'promo' ? 'Kamu memilih tetap di akademi untuk satu musim lagi. Matangkan dulu kemampuanmu.' : 'Kamu memutuskan bertahan dan menolak semua tawaran.');
    if (g.offerMode === 'window' && g.hero.transferRequested) g.hero.transferRequested = false;
    return;
  }
  acceptOffer(g, p.offers[idx]);
}

// ======================= akhir musim =======================

function stageSeasonEnd(g: GameState): boolean {
  const h = g.hero;
  const w = g.world;
  const youth = h.status === 'academy';
  const table = sortedTable(w);
  const pos = table.findIndex((r) => r.clubId === h.clubId) + 1;
  const champ = clubOf(w, table[0].clubId);
  const s = h.season;
  const avg = s.apps ? s.ratingSum / s.apps : 0;
  const label = seasonLabel(g);
  const lines: string[] = [];

  let topName = '-';
  if (!youth) {
    const best = [...w.players].sort((a, b) => b.goals - a.goals)[0];
    topName = best && best.goals > s.goals ? `${best.name} (${best.goals})` : `${h.name} (${s.goals})`;
    if (!(best && best.goals > s.goals) && s.goals >= 8) {
      h.trophies.push(`Sepatu Emas ${label}`);
      lines.push(`Kamu menjadi top skor liga dengan ${s.goals} gol!`);
    }
  }
  if (pos === 1 && s.apps >= (youth ? 10 : 8)) {
    h.trophies.push(`${youth ? 'Juara Liga U-18' : `Juara ${w.leagueName}`} ${label}`);
    lines.push(`${clubOf(w, h.clubId).name} menjuarai liga dan kamu ikut mengangkat trofi!`);
    h.fame = clamp(h.fame + 4, 0, 100);
  }
  if (s.apps >= 15 && avg >= 7.3 && h.age <= 21 && !youth) {
    h.trophies.push(`Pemain Muda Terbaik ${label}`);
    lines.push('Kamu dinobatkan sebagai Pemain Muda Terbaik musim ini.');
  }

  lines.unshift(
    `${clubOf(w, h.clubId).name} finis di posisi ${pos} dari ${table.length}${youth ? ' (Liga U-18)' : ''}. Juara: ${champ.short}.`,
    `Statistikmu: ${s.apps} laga (${s.starts} starter), ${s.goals} gol, ${s.assists} assist, rating rata-rata ${s.apps ? r1(avg) : '-'}.`,
  );
  const rival = w.rivalId ? w.players.find((p) => p.id === w.rivalId) : null;
  if (rival && !youth) lines.push(`Rivalmu ${rival.name} mencetak ${rival.goals} gol untuk ${clubOf(w, rival.clubId).short}.`);

  h.seasonsLog.push({
    season: g.seasonNo, age: h.age, clubName: clubOf(w, h.clubId).short, comp: youth ? 'U-18' : 'Liga', pos,
    apps: s.apps, goals: s.goals, assists: s.assists, avgRating: s.apps ? +avg.toFixed(2) : 0, overall: overallOf(h.attrs),
  });
  g.history.push({ season: g.seasonNo, champion: champ.short, topScorer: topName });
  g.prompt = info(`Akhir musim ${label}`, lines, 'Lanjut ke masa liburan');
  g.stage = 'offseason';
  g.osStep = 0;
  return true;
}

function stageOffseason(g: GameState): boolean {
  const rng = new RNG(g);
  const h = g.hero;
  switch (g.osStep) {
    case 0: {
      h.age++;
      const before = overallOf(h.attrs);
      ageProgress(h, () => rng.gauss(0, 1));
      const after = overallOf(h.attrs);
      h.contract.yearsLeft--;
      h.injuryWeeks = Math.max(0, h.injuryWeeks - 6);
      h.fitness = 100;
      h.morale = clamp(h.morale + 5, 0, 100);
      h.season = emptyStats();
      h.notPlayedStreak = 0;
      h.goalDrought = 0;
      h.goalStreak = 0;
      h.peakOverall = Math.max(h.peakOverall, after);
      advanceWorld(g);
      resetSeason(g);
      g.seasonNo++;
      g.week = 1;
      g.t += 4;
      log(g, 'week', `Musim ${seasonLabel(g)}`, 'Pramusim');
      log(g, 'story', `Pramusim selesai. Umurmu sekarang ${h.age}. Perkembangan atribut: overall ${before} → ${after}.`);
      g.osStep = 1;
      return false;
    }
    case 1: {
      g.osStep = 2;
      if (h.status === 'academy') {
        if (h.age >= 18) {
          g.prompt = offersPrompt(g, 'academy', makeOffers(g, 'academy'));
          return true;
        }
        const own = clubOf(g.world, h.clubId);
        if (h.age === 17 && effRating(h) >= strikerLevel(g, own.id) - 8) {
          const offers = makeOffers(g, 'promo').filter((o) => o.clubId === h.clubId);
          if (offers.length) {
            g.prompt = offersPrompt(g, 'promo', offers);
            return true;
          }
        }
        return false;
      }
      if (h.contract.yearsLeft <= 0) {
        log(g, 'event', 'Kontrakmu berakhir. Kamu berstatus bebas transfer.');
        g.prompt = offersPrompt(g, 'free', makeOffers(g, 'free'));
        return true;
      }
      const offers = makeOffers(g, 'window');
      if (offers.length) {
        log(g, 'event', 'Bursa transfer musim panas: beberapa klub menghubungi agenmu.');
        g.prompt = offersPrompt(g, 'window', offers);
        return true;
      }
      return false;
    }
    case 2: {
      g.osStep = 3;
      const forced = h.age >= 38 || h.injuryWeeks > 30;
      if (h.age >= 34 || forced) {
        g.prompt = {
          kind: 'retire', canContinue: !forced,
          text: forced ? 'Tubuhmu tidak lagi mampu mengikuti tuntutan pertandingan. Saatnya menggantung sepatu.' : `Usiamu ${h.age}. Kamu masih bisa bermain, tapi banyak yang mulai bertanya kapan kamu pensiun.`,
        };
        return true;
      }
      return false;
    }
    default: {
      g.osStep = 0;
      g.stage = 'weekStart';
      return false;
    }
  }
}

function handleRetire(g: GameState, idx: number) {
  const p = g.prompt;
  if (p.kind !== 'retire') return;
  if (idx === 0 && p.canContinue) {
    log(g, 'story', 'Kamu memutuskan bermain satu musim lagi.');
    return;
  }
  retire(g);
}

function retire(g: GameState) {
  const h = g.hero;
  const c = h.career;
  const score = c.goals * 2 + c.assists + h.trophies.length * 30 + h.peakOverall * 3 + h.caps * 2;
  const title = score > 1400 ? 'Legenda Sepak Bola Nusantara' : score > 900 ? 'Bintang Besar' : score > 550 ? 'Pemain Profesional Sukses' : score > 300 ? 'Pemain Solid' : 'Perjalanan yang Layak Dikenang';
  const club = clubOf(g.world, h.clubId);
  g.stage = 'retired';
  log(g, 'story', `${h.name} resmi gantung sepatu di usia ${h.age}. Stadion ${club.short} berdiri memberi tepuk tangan.`);
  g.prompt = {
    kind: 'end', title: `${h.name}: ${title}`,
    lines: [
      `Umur pensiun ${h.age} · Overall puncak ${h.peakOverall} · ${g.seasonNo - 1} musim`,
      `${c.apps} laga · ${c.goals} gol · ${c.assists} assist · ${c.apps ? r1(c.ratingSum / c.apps) : '-'} rating rata-rata`,
      `Timnas: ${h.caps} caps, ${h.capGoals} gol`,
      h.trophies.length ? `Trofi: ${h.trophies.join(', ')}` : 'Belum ada trofi, tapi ceritanya tetap berkesan.',
      `Total uang: ${money(h.money)}`,
    ],
  };
}

// helper untuk UI
export const heroClub = (g: GameState) => clubOf(g.world, g.hero.clubId);
export function nextFixture(g: GameState) {
  if (g.week > 34) return null;
  const fx = g.world.schedule[g.week - 1].find((f) => f.includes(g.hero.clubId));
  if (!fx) return null;
  const home = fx[0] === g.hero.clubId;
  return { home, opp: clubOf(g.world, home ? fx[1] : fx[0]) };
}
export { offerLine, clubLevel, applyFx };
