import { EVENTS, type Ctx, type EventDef, type Effects } from '../data/events';
import { log } from './log';
import { overallOf } from './player';
import { RNG } from './rng';
import { clamp } from './util';
import { clubOf, newManager } from './world';
import type { AttrKey, GameState, RelKey } from './types';

export function makeCtx(g: GameState): Ctx {
  const h = g.hero;
  return {
    g, h,
    club: clubOf(g.world, h.clubId),
    rival: g.world.rivalId ? g.world.players.find((p) => p.id === g.world.rivalId) ?? null : null,
    has: (f) => (h.flags[f] ?? 0) > g.t,
    ovr: overallOf(h.attrs),
  };
}

export function applyFx(g: GameState, fx: Effects): void {
  const h = g.hero;
  const rng = new RNG(g);
  if (fx.morale) h.morale = clamp(h.morale + fx.morale, 0, 100);
  if (fx.fitness) h.fitness = clamp(h.fitness + fx.fitness, 0, 100);
  if (fx.form) h.form = clamp(h.form + fx.form, 0, 100);
  if (fx.money) h.money += fx.money;
  if (fx.fame) h.fame = clamp(h.fame + fx.fame, 0, 100);
  if (fx.rel) for (const [k, v] of Object.entries(fx.rel)) h.rel[k as RelKey] = clamp(h.rel[k as RelKey] + (v ?? 0), 0, 100);
  if (fx.attr) for (const [k, v] of Object.entries(fx.attr)) h.attrs[k as AttrKey] = clamp(h.attrs[k as AttrKey] + (v ?? 0), 20, 97);
  if (fx.injuryWeeks) h.injuryWeeks = Math.max(h.injuryWeeks, fx.injuryWeeks);
  if (fx.flag) for (const [k, w] of Object.entries(fx.flag)) h.flags[k] = g.t + w;
  if (fx.schedule) for (const s of fx.schedule) h.sched.push({ id: s.id, at: g.t + s.weeks });
  if (fx.transferRequest) h.transferRequested = true;
  if (fx.contract) {
    h.contract.yearsLeft = fx.contract.years;
    h.contract.salary = +(h.contract.salary * fx.contract.salaryMult).toFixed(1);
  }
  if (fx.special === 'newManager') {
    clubOf(g.world, h.clubId).manager = newManager(rng);
    h.rel.manager = 50;
  }
  if (fx.special === 'cap') {
    h.caps++;
    if (rng.chance(0.4)) h.capGoals++;
  }
}

function eligible(g: GameState, ev: EventDef, c: Ctx): boolean {
  if (ev.chainOnly) return false;
  if (ev.once && g.hero.done.includes(ev.id)) return false;
  if ((g.hero.cooldown[ev.id] ?? 0) > g.t) return false;
  return ev.cond ? ev.cond(c) : true;
}

/** Pilih event untuk pekan ini: jadwal berantai dulu, lalu acak. */
export function pickEvent(g: GameState, rng: RNG): EventDef | null {
  const h = g.hero;
  const due = h.sched.findIndex((s) => s.at <= g.t);
  if (due >= 0) {
    const id = h.sched.splice(due, 1)[0].id;
    const ev = EVENTS.find((e) => e.id === id);
    if (ev) return ev;
  }
  if (g.t - g.lastEventT < 1 || !rng.chance(0.58)) return null;
  const c = makeCtx(g);
  const pool = EVENTS.filter((e) => eligible(g, e, c));
  if (pool.length === 0) return null;
  return rng.weighted(pool, (e) => e.weight);
}

export function openEvent(g: GameState, ev: EventDef): void {
  const c = makeCtx(g);
  const map: number[] = [];
  const labels: string[] = [];
  ev.choices.forEach((ch, i) => {
    if (!ch.requires || ch.requires(c)) {
      map.push(i);
      labels.push(ch.label);
    }
  });
  g.eventMap = map;
  g.eventId = ev.id;
  g.lastEventT = g.t;
  g.prompt = { kind: 'event', title: ev.title, text: typeof ev.text === 'function' ? ev.text(c) : ev.text, choices: labels };
}

export function resolveEvent(g: GameState, shownIdx: number): void {
  const rng = new RNG(g);
  const ev = EVENTS.find((e) => e.id === g.eventId)!;
  const ch = ev.choices[g.eventMap[shownIdx]];
  const oc = rng.weighted(ch.outcomes, (o) => o.p ?? 1);
  g.hero.cooldown[ev.id] = g.t + (ev.cooldown ?? 12);
  if (ev.once) g.hero.done.push(ev.id);
  applyFx(g, oc.fx);
  const score = (oc.fx.morale ?? 0) + (oc.fx.fame ?? 0) + (oc.fx.money ?? 0) / 50 + Object.values(oc.fx.rel ?? {}).reduce((s, v) => s + (v ?? 0), 0);
  log(g, 'story', `Kamu memilih: ${ch.label}`);
  log(g, score >= 3 ? 'good' : score <= -3 ? 'bad' : 'event', oc.text);
  g.eventId = null;
}
