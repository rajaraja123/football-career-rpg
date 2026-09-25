export type Position = 'GK' | 'DF' | 'MF' | 'FW';
export type AttrKey = 'pace' | 'shooting' | 'dribbling' | 'passing' | 'physical' | 'mental';
export type Attrs = Record<AttrKey, number>;
export type Role = 'starter' | 'rotation' | 'prospect';
export type RelKey = 'manager' | 'team' | 'fans' | 'media' | 'agent';

export interface Player {
  id: string;
  name: string;
  age: number;
  pos: Position;
  overall: number;
  potential: number;
  clubId: string;
  goals: number; // gol musim ini (untuk tabel top skor)
}

export interface Manager {
  name: string;
  style: 'ofensif' | 'defensif' | 'seimbang';
  temper: 'sabar' | 'keras' | 'seimbang';
}

export interface Club {
  id: string;
  name: string;
  short: string;
  city: string;
  reputation: number; // 40-80
  budget: number; // €K
  color: string;
  blurb: string;
  formation: 1 | 2; // jumlah striker utama
  manager: Manager;
  youthLevel: number;
  youthNames: string[];
}

export interface Standing {
  pld: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export type Fixture = [string, string]; // [homeId, awayId]

export interface World {
  leagueName: string;
  clubs: Club[];
  players: Player[];
  standings: Record<string, Standing>;
  schedule: Fixture[][]; // index 0 = pekan 1
  rivalId: string | null;
  nextId: number;
}

export interface SeasonStats {
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  ratingSum: number;
}

export interface SeasonRecord {
  season: number;
  age: number;
  clubName: string;
  comp: string;
  pos: number;
  apps: number;
  goals: number;
  assists: number;
  avgRating: number;
  overall: number;
}

export interface Hero {
  name: string;
  age: number;
  archetype: string;
  attrs: Attrs;
  potential: number;
  clubId: string;
  status: 'academy' | 'senior';
  role: Role;
  contract: { salary: number; yearsLeft: number }; // salary €K / bulan
  fitness: number;
  form: number;
  morale: number;
  injuryWeeks: number;
  money: number; // €K
  fame: number;
  rel: Record<RelKey, number>;
  season: SeasonStats;
  career: SeasonStats;
  seasonsLog: SeasonRecord[];
  trophies: string[];
  caps: number;
  capGoals: number;
  transferRequested: boolean;
  flags: Record<string, number>; // nama flag -> berlaku sampai waktu t
  sched: { id: string; at: number }[]; // event berantai yang dijadwalkan
  done: string[]; // event sekali-jadi yang sudah terjadi
  cooldown: Record<string, number>;
  notPlayedStreak: number;
  goalDrought: number; // laga starter tanpa gol
  goalStreak: number; // laga berturut-turut mencetak gol
  peakOverall: number;
  weeklyGain: string; // ringkasan latihan
}

export type LogKind = 'sys' | 'story' | 'match' | 'goal' | 'event' | 'good' | 'bad' | 'week';
export interface LogEntry {
  k: LogKind;
  text: string;
  tag?: string;
}

export interface Offer {
  clubId: string;
  role: Role;
  salary: number;
  years: number;
  fee: number;
  renew?: boolean;
}

export interface MomentChoice {
  label: string;
  p: number; // peluang berhasil (0..1), dipakai untuk label risiko
}

export type Prompt =
  | { kind: 'training' }
  | { kind: 'rehab' }
  | { kind: 'event'; title: string; text: string; choices: string[] }
  | { kind: 'moment'; title: string; text: string; minute: number; choices: MomentChoice[] }
  | { kind: 'info'; title: string; lines: string[]; button: string }
  | { kind: 'offers'; title: string; text: string; offers: Offer[]; canStay: boolean; stayLabel: string }
  | { kind: 'retire'; canContinue: boolean; text: string }
  | { kind: 'end'; title: string; lines: string[] };

export interface MomentState {
  templateId: string;
  stepId: string;
  minute: number;
  mate: string;
  def: string;
  gk: string;
  shotMod: number;
  shotKind: 'foot' | 'header';
  mode: 'steps' | 'shot';
  ok: number; // jumlah aksi sukses (untuk rating)
}

export interface Chance {
  team: 'us' | 'them';
  minute: number;
  kind: 'chance' | 'press';
}

export interface MatchState {
  oppId: string;
  home: boolean;
  youth: boolean;
  block: number;
  queue: Chance[];
  score: { us: number; them: number };
  from: number;
  to: number;
  starter: boolean;
  injured: boolean;
  injuryWeeks: number;
  ratings: { usAtk: number; usDef: number; themAtk: number; themDef: number };
  mates: string[];
  oppAtk: string[];
  oppDef: string[];
  oppGK: string;
  lineupUs: { name: string; pos: Position }[];
  lineupThem: { name: string; pos: Position }[];
  goals: number;
  assists: number;
  shots: number;
  moments: number;
  rating: number;
  moment: MomentState | null;
  done: boolean;
}

export type Stage =
  | 'weekStart'
  | 'weekEvent'
  | 'preMatch'
  | 'inMatch'
  | 'matchDone'
  | 'weekEnd'
  | 'window'
  | 'seasonEnd'
  | 'offseason'
  | 'retired';

export interface SeasonHistoryRow {
  season: number;
  champion: string;
  topScorer: string;
}

export interface GameState {
  v: number;
  rng: number;
  seasonNo: number;
  startYear: number;
  week: number; // 1..34
  t: number; // hitungan minggu absolut
  stage: Stage;
  world: World;
  hero: Hero;
  log: LogEntry[];
  prompt: Prompt;
  match: MatchState | null;
  heroPlayedThisWeek: boolean;
  eventMap: number[]; // index pilihan tampil -> index pilihan di data event
  eventId: string | null;
  osStep: number; // sub-tahap fase offseason
  offerMode: 'window' | 'free' | 'academy' | 'promo' | null;
  lastEventT: number;
  history: SeasonHistoryRow[];
}
