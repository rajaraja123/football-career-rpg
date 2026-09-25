// Template "momen kunci" di dalam pertandingan.
// Placeholder teks: {mate} rekan setim, {def} bek lawan, {gk} kiper lawan, {opp} nama lawan.
//
// Setiap pilihan (choice):
//   stat + diff  -> ada pengecekan skill (peluang = fungsi dari stat pemain vs diff + kualitas lawan)
//   tanpa stat   -> langsung sukses
//   next         -> apa yang terjadi bila sukses
//   failNext     -> bila gagal (default: bola hilang)
import type { AttrKey } from '../engine/types';

export type Next =
  | { step: string }
  | { shot: number; kind?: 'foot' | 'header' } // lanjut ke tembakan; angka = tambahan kesulitan
  | { assist: number } // umpan ke rekan; angka = peluang rekan mencetak gol
  | { end: 'lost' | 'neutral' | 'goal' | 'miss' };

export interface MChoice {
  label: string;
  stat?: AttrKey;
  diff?: number;
  ok: string;
  fail?: string;
  next: Next;
  failNext?: Next;
}
export interface MStep {
  text: string;
  choices: MChoice[];
}
export interface MTemplate {
  id: string;
  title: string;
  weight: number;
  tags?: string[]; // dipakai untuk bobot per tipe pemain
  start: string;
  steps: Record<string, MStep>;
}

// Langkah yang dipakai bersama beberapa template
export const SHARED: Record<string, MStep> = {
  control: {
    text: 'Bola sudah aman di kakimu. {def} menekan, tapi ada ruang setengah meter.',
    choices: [
      { label: 'Tembak langsung', ok: 'Kamu tidak mau menunggu.', next: { shot: 4 } },
      { label: 'Lewati {def} dengan dribel', stat: 'dribbling', diff: 60, ok: 'Sentuhan halus! {def} terjatuh dan kamu punya ruang.', fail: 'Sentuhanmu terlalu panjang, {def} menyapu bola.', next: { shot: -4 } },
      { label: 'Umpan ke {mate}', stat: 'passing', diff: 54, ok: 'Umpan tajam ke kaki {mate}.', fail: 'Umpanmu terlalu keras, bola keluar.', next: { assist: 0.4 } },
      { label: 'Tahan bola, tunggu dukungan', stat: 'physical', diff: 52, ok: 'Kamu memunggungi {def} dan {mate} datang menyusul.', fail: '{def} menyikut bola dari kakimu.', next: { assist: 0.3 } },
    ],
  },
  oneOne: {
    text: 'Kamu berhadapan satu lawan satu dengan {gk}!',
    choices: [
      { label: 'Tembak sebelum kiper menutup', ok: 'Tidak ada waktu berpikir.', next: { shot: -3 } },
      { label: 'Kelabui kiper dengan dribel', stat: 'dribbling', diff: 64, ok: '{gk} terkecoh dan jatuh! Gawang terbuka.', fail: '{gk} menutup sudut dan bola tersapu.', next: { shot: -14 } },
    ],
  },
};

export const MOMENTS: MTemplate[] = [
  {
    id: 'longball',
    title: 'Umpan panjang',
    weight: 3,
    tags: ['target'],
    start: 'longball',
    steps: {
      longball: {
        text: 'Bek tengah melepas umpan panjang ke arahmu. {def} mengejar dari belakang, {gk} bersiap maju.',
        choices: [
          { label: 'Kontrol dengan dada', stat: 'dribbling', diff: 56, ok: 'Bola jinak di dadamu.', fail: 'Bola memantul terlalu jauh, {def} menyapunya.', next: { step: 'control' } },
          { label: 'Sundul ke ruang kosong', stat: 'physical', diff: 58, ok: 'Kamu menang duel udara, bola jatuh di depanmu.', fail: '{def} menang duel udara.', next: { step: 'control' } },
          { label: 'Biarkan bola, kejar dengan kecepatan', stat: 'pace', diff: 60, ok: 'Kamu melesat! Bola sudah di kakimu sebelum {def} bereaksi.', fail: '{def} lebih dulu ke bola.', next: { step: 'oneOne' } },
        ],
      },
    },
  },
  {
    id: 'through',
    title: 'Umpan terobosan',
    weight: 3,
    tags: ['speedster', 'technician'],
    start: 'through',
    steps: {
      through: {
        text: '{mate} menerima bola di lini tengah dan mengangkat kepala. Ada ruang di belakang bek lawan.',
        choices: [
          { label: 'Lari ke ruang kosong', stat: 'pace', diff: 58, ok: 'Umpan terobosan sempurna, kamu berlari bebas.', fail: 'Kamu offside! Bendera terangkat.', next: { step: 'oneOne' } },
          { label: 'Minta bola ke kaki', stat: 'dribbling', diff: 54, ok: 'Kamu menerima bola dengan mulus.', fail: 'Kontrolmu kurang rapi, bola hilang.', next: { step: 'control' } },
          { label: 'Main satu-dua dengan {mate}', stat: 'passing', diff: 60, ok: 'Tembok sempurna! Kamu berlari menerima pantulan.', fail: 'Bek memotong umpan balikmu.', next: { step: 'oneOne' } },
        ],
      },
    },
  },
  {
    id: 'cross',
    title: 'Umpan silang',
    weight: 3,
    tags: ['target'],
    start: 'cross',
    steps: {
      cross: {
        text: '{mate} menyisir sayap dan mengangkat kepala. Umpan silang meluncur ke kotak penalti!',
        choices: [
          { label: 'Sundul di tiang dekat', stat: 'physical', diff: 56, ok: 'Kamu meloncat paling tinggi!', fail: '{def} menghalangi lompatanmu.', next: { shot: 3, kind: 'header' } },
          { label: 'Tunggu di tiang jauh, siapkan volley', stat: 'shooting', diff: 62, ok: 'Bola jatuh persis di kaki kananmu.', fail: 'Timing lompatanmu meleset, bola melewatimu.', next: { shot: 2 } },
          { label: 'Menyelinap di belakang {def}', stat: 'mental', diff: 56, ok: '{def} kehilangan kamu sesaat, kamu bebas menyundul.', fail: '{def} membaca gerakanmu dan menutup ruang.', next: { shot: -4, kind: 'header' } },
        ],
      },
    },
  },
  {
    id: 'rebound',
    title: 'Bola liar',
    weight: 2,
    start: 'rebound',
    steps: {
      rebound: {
        text: 'Tembakan {mate} ditepis {gk}. Bola liar memantul di depan kotak penalti!',
        choices: [
          { label: 'Sambar langsung', stat: 'pace', diff: 52, ok: 'Kamu paling cepat bereaksi!', fail: '{def} lebih dulu menyapu bola.', next: { shot: -6 } },
          { label: 'Kontrol dulu, baru tembak', stat: 'dribbling', diff: 55, ok: 'Satu sentuhan dan kamu siap menembak.', fail: 'Bola membentur tulang keringmu dan terlepas.', next: { shot: -2 } },
        ],
      },
    },
  },
  {
    id: 'counter',
    title: 'Serangan balik',
    weight: 2,
    tags: ['speedster'],
    start: 'counter',
    steps: {
      counter: {
        text: 'Turnover! Timmu melancarkan serangan balik kilat. Kamu berlari di depan dan dua bek {opp} tertinggal.',
        choices: [
          { label: 'Terima umpan lalu terus berlari', stat: 'pace', diff: 58, ok: 'Kamu meninggalkan semua orang.', fail: 'Umpanmu terlalu lambat diterima, bek {opp} sempat menutup.', next: { step: 'oneOne' } },
          { label: 'Umpan ke {mate} yang overlap', stat: 'passing', diff: 56, ok: 'Umpan datar tepat sasaran.', fail: 'Umpanmu tersapu bek.', next: { assist: 0.42 } },
          { label: 'Tahan bola, tunggu rekan naik', stat: 'mental', diff: 50, ok: 'Kepala dingin. Serangan tetap terkendali.', fail: 'Kamu ragu dan kehilangan momentum.', next: { step: 'control' } },
        ],
      },
    },
  },
  {
    id: 'wide',
    title: 'Menerima bola di sisi lapangan',
    weight: 2,
    tags: ['technician', 'speedster'],
    start: 'wide',
    steps: {
      wide: {
        text: 'Kamu turun melebar dan menerima bola. {def} menempel ketat di punggungmu.',
        choices: [
          { label: 'Cut inside dan tembak', stat: 'dribbling', diff: 58, ok: 'Kamu memotong ke dalam dengan tajam.', fail: '{def} menutup ruang, tembakan urung.', next: { shot: 0 } },
          { label: 'Umpan tarik ke {mate}', stat: 'passing', diff: 56, ok: 'Umpan tarik yang manis ke titik penalti.', fail: 'Umpan tarikmu terlalu jauh dari sasaran.', next: { assist: 0.44 } },
          { label: 'Kalahkan {def} dengan kecepatan', stat: 'pace', diff: 62, ok: 'Kamu melewatinya seperti angin!', fail: '{def} menggeser badan dan memenangkan bola.', next: { step: 'control' } },
        ],
      },
    },
  },
  {
    id: 'press',
    title: 'Tekan kiper lawan',
    weight: 0, // tidak dipilih dari peluang tim; dipicu terpisah oleh match engine
    start: 'press',
    steps: {
      press: {
        text: '{gk} menerima back-pass dan ragu. Kamu bisa menekan.',
        choices: [
          { label: 'Tekan agresif', stat: 'pace', diff: 56, ok: 'Kiper panik dan bola nyaris ke kakimu!', fail: 'Kiper membuang bola jauh.', next: { shot: -10 }, failNext: { end: 'neutral' } },
          { label: 'Tutup jalur umpan dengan cerdik', stat: 'mental', diff: 52, ok: 'Kiper terpaksa membuang bola. Tim menguasai bola lagi.', fail: 'Kiper menemukan celah umpan.', next: { end: 'neutral' }, failNext: { end: 'neutral' } },
          { label: 'Tetap di posisi, hemat tenaga', ok: 'Kamu menahan diri.', next: { end: 'neutral' } },
        ],
      },
    },
  },
  {
    id: 'penalty',
    title: 'PENALTI!',
    weight: 0,
    start: 'pen',
    steps: {
      pen: {
        text: 'Wasit menunjuk titik putih! Kamu berdiri di depan bola, {gk} menatapmu. Stadion hening.',
        choices: [
          { label: 'Pojok kiri bawah, keras', stat: 'shooting', diff: 50, ok: 'Bola melesat ke sudut!', fail: '{gk} menerka dengan benar dan menepis!', next: { end: 'goal' }, failNext: { end: 'miss' } },
          { label: 'Pojok kanan atas', stat: 'shooting', diff: 58, ok: 'Tak terjangkau! Sempurna.', fail: 'Bola melambung di atas mistar.', next: { end: 'goal' }, failNext: { end: 'miss' } },
          { label: 'Panenka di tengah', stat: 'mental', diff: 64, ok: 'Sangat berani! {gk} sudah jatuh ke kiri.', fail: '{gk} tetap berdiri dan menangkap bola dengan santai.', next: { end: 'goal' }, failNext: { end: 'miss' } },
          { label: 'Tengah gawang, aman', stat: 'mental', diff: 44, ok: 'Kiper sudah melompat, bola masuk.', fail: 'Tekanan terlalu besar, tendanganmu lemah dan ditangkap.', next: { end: 'goal' }, failNext: { end: 'miss' } },
        ],
      },
    },
  },
];

// Pilihan penempatan tembakan
export interface ShotOption {
  label: string;
  stat: AttrKey;
  diff: number;
  fails: Record<string, number>; // jenis kegagalan -> bobot
}
export const SHOT_FOOT: ShotOption[] = [
  { label: 'Pojok kiri bawah', stat: 'shooting', diff: 0, fails: { saved: 40, wide: 30, block: 15, post: 15 } },
  { label: 'Pojok kanan atas', stat: 'shooting', diff: 8, fails: { wide: 45, saved: 25, post: 20, block: 10 } },
  { label: 'Placing tenang', stat: 'mental', diff: 3, fails: { saved: 55, wide: 20, block: 15, post: 10 } },
  { label: 'Sepakan keras ke tengah', stat: 'physical', diff: -5, fails: { saved: 50, block: 30, wide: 20 } },
];
export const SHOT_HEAD: ShotOption[] = [
  { label: 'Arahkan ke pojok jauh', stat: 'shooting', diff: 2, fails: { wide: 45, saved: 35, post: 20 } },
  { label: 'Tanduk keras ke bawah', stat: 'physical', diff: 0, fails: { saved: 50, wide: 30, block: 20 } },
  { label: 'Tekuk ke tengah', stat: 'mental', diff: -2, fails: { saved: 65, wide: 25, block: 10 } },
];

export const SHOT_TEXT = {
  goal: ['GOOOL! Bola menghujam gawang {gk}!', 'Gol! {gk} hanya bisa menoleh melihat bola masuk.', 'Tak terbendung! Jaring gawang bergetar.', 'Masuuk! Stadion meledak!'],
  saved: ['{gk} melakukan penyelamatan gemilang!', '{gk} membaca arah dan menepisnya.', 'Refleks luar biasa dari {gk}, sedikit lagi!'],
  wide: ['Bola melebar tipis di sisi tiang.', 'Tembakanmu melambung di atas mistar.', 'Sedikit saja, bola melintas di sisi gawang.'],
  block: ['{def} menjulurkan kaki dan memblok tembakanmu!', 'Tembakan tertahan badan {def}.'],
  post: ['Tiang! Bola membentur tiang dan keluar.', 'Mistar gawang bergetar! Nyaris sekali.'],
} as const;
