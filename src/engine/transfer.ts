import { effRating, heroValue, overallOf } from './player';
import { log } from './log';
import { RNG } from './rng';
import { clamp, money, sigmoid } from './util';
import { clubLevel, clubOf, newManager, strikerLevel } from './world';
import type { GameState, Offer, Role } from './types';

export type OfferMode = 'window' | 'free' | 'academy' | 'promo';

function roleFor(diff: number): Role {
  return diff >= 4 ? 'starter' : diff >= -3 ? 'rotation' : 'prospect';
}

function salaryFor(g: GameState, clubId: string, mode: OfferMode, role: Role): number {
  const h = g.hero;
  const club = clubOf(g.world, clubId);
  if (mode === 'academy' || mode === 'promo') return Math.max(0.6, +(heroValue(h) * 0.009 * (0.8 + club.reputation / 100)).toFixed(1));
  const agentBonus = 1 + (h.rel.agent - 50) * 0.0025; // agen yang loyal menegosiasikan gaji lebih baik
  const base = heroValue(h) * 0.012 * (0.75 + club.reputation / 100) * agentBonus;
  const roleMult = role === 'starter' ? 1.1 : role === 'rotation' ? 1 : 0.85;
  return Math.max(1, +(base * roleMult).toFixed(1));
}

/** Membuat daftar tawaran. Klub bisa juga menolak melepas pemain (dicatat di log). */
export function makeOffers(g: GameState, mode: OfferMode): Offer[] {
  const rng = new RNG(g);
  const h = g.hero;
  const eff = effRating(h);
  const own = clubOf(g.world, h.clubId);
  const offers: Offer[] = [];
  const isYouthDeal = mode === 'academy' || mode === 'promo';

  for (const c of g.world.clubs) {
    const level = strikerLevel(g, c.id);
    const diff = eff - level;
    const isOwn = c.id === h.clubId;

    if (isYouthDeal) {
      // kontrak profesional pertama: klub bersedia bila potensi cukup
      if (diff < -13) continue;
      const p = sigmoid((diff + 12) / 4) * (isOwn ? 1.0 : 0.6);
      if (!isOwn && !rng.chance(p)) continue;
      if (isOwn && diff < -16 && !rng.chance(0.3)) continue;
    } else {
      if (isOwn && mode === 'window') continue;
      const fameBoost = (h.fame - 20) * 0.04;
      const p = sigmoid((diff + 1 + fameBoost) / 3.5) * (isOwn ? 1.2 : 0.85);
      if (!rng.chance(p)) continue;
      if (diff < -6 && !isOwn) continue;
    }

    const role = isYouthDeal ? (diff >= 2 ? 'rotation' : 'prospect') : roleFor(diff);
    const salary = salaryFor(g, c.id, mode, role);
    const fee = mode === 'window' ? Math.round(heroValue(h) * rng.float(0.8, 1.25)) : 0;

    // klub pembeli harus mampu membayar
    if (fee > c.budget * 0.7) continue;

    const years = isYouthDeal ? rng.int(2, 3) : h.age >= 31 ? rng.int(1, 2) : rng.int(2, 4);
    offers.push({ clubId: c.id, role, salary, years, fee, renew: isOwn });
  }

  // tampilkan yang paling menarik lebih dulu
  offers.sort((a, b) => clubOf(g.world, b.clubId).reputation - clubOf(g.world, a.clubId).reputation);
  let picked = offers;

  if (mode === 'window') {
    picked = offers.slice(0, 6);
    picked = rng.shuffle(picked).slice(0, 3);
    // klub asal bisa menolak melepas
    const keep: Offer[] = [];
    for (const o of picked) {
      let refuse = 0;
      if (!h.transferRequested) refuse = h.role === 'starter' ? 0.55 : 0.3;
      else refuse = h.role === 'starter' ? 0.35 : 0.12;
      if (h.contract.yearsLeft <= 1) refuse *= 0.3;
      if (rng.chance(refuse)) {
        log(g, 'story', `${clubOf(g.world, o.clubId).name} mengajukan tawaran ${money(o.fee)} untukmu, tapi manajemen ${own.short} menolaknya mentah-mentah.`);
      } else keep.push(o);
    }
    picked = keep.sort((a, b) => clubOf(g.world, b.clubId).reputation - clubOf(g.world, a.clubId).reputation);
  } else {
    picked = offers.slice(0, 4);
  }

  // jaring pengaman: kontrak pertama / bebas transfer harus selalu ada pilihan
  if (picked.length === 0 && (mode === 'academy' || mode === 'free')) {
    const weakest = [...g.world.clubs].sort((a, b) => a.reputation - b.reputation)[0];
    picked = [{ clubId: weakest.id, role: 'prospect', salary: salaryFor(g, weakest.id, mode, 'prospect'), years: 2, fee: 0 }];
  }
  return picked;
}

export function offerLine(g: GameState, o: Offer): string {
  const c = clubOf(g.world, o.clubId);
  const role = o.role === 'starter' ? 'Pemain inti' : o.role === 'rotation' ? 'Rotasi' : 'Prospek';
  const fee = o.fee > 0 ? ` · Biaya transfer ${money(o.fee)}` : '';
  return `${c.name}${o.renew ? ' (klub sekarang)' : ''} · ${role} · Gaji ${money(o.salary)}/bulan · ${o.years} tahun${fee}`;
}

export function acceptOffer(g: GameState, o: Offer): void {
  const rng = new RNG(g);
  const h = g.hero;
  const old = clubOf(g.world, h.clubId);
  const c = clubOf(g.world, o.clubId);
  const same = o.clubId === h.clubId;
  h.contract = { salary: o.salary, yearsLeft: o.years };
  h.role = o.role;
  h.transferRequested = false;
  h.money += o.salary * 2; // bonus tanda tangan
  if (h.status === 'academy') h.status = 'senior';
  if (same) {
    log(g, 'good', `Kamu menandatangani kontrak baru bersama ${c.name}: ${o.years} tahun, gaji ${money(o.salary)}/bulan.`);
    h.rel.manager = clamp(h.rel.manager + 4, 0, 100);
    return;
  }
  h.clubId = o.clubId;
  h.rel.manager = 50;
  h.rel.team = 45;
  h.rel.fans = clamp(h.rel.fans * 0.5 + 20, 10, 80);
  h.form = 50;
  h.notPlayedStreak = 0;
  c.manager = c.manager ?? newManager(rng);
  h.fame = clamp(h.fame + (clubLevel(c) > clubLevel(old) ? 3 : 0), 0, 100);
  log(g, 'good', `RESMI! ${h.name} bergabung dengan ${c.name}. Kontrak ${o.years} tahun, gaji ${money(o.salary)}/bulan${o.fee > 0 ? `, biaya transfer ${money(o.fee)}` : ''}.`);
  log(g, 'story', `Pelatih baru, ${c.manager.name}, menyambutmu di ruang ganti. Peranmu: ${o.role === 'starter' ? 'pemain inti' : o.role === 'rotation' ? 'rotasi' : 'prospek'}.`);
}

export function playerOverall(g: GameState) {
  return overallOf(g.hero.attrs);
}
