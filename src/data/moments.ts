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
  | { shot: number; kind?: 'foot' | 'header' | 'acrobatic' } // lanjut ke tembakan; angka = tambahan kesulitan
  | { assist: number } // umpan ke rekan; angka = peluang rekan mencetak gol
  | { end: 'lost' | 'neutral' | 'goal' | 'miss' | 'win' | 'control' } // win = rebut bola, control = kuasai/tahan bola untuk tim
  | { foul: 'soft' | 'hard' }; // menangkan pelanggaran; 'hard' = peluang kartu untuk bek lebih besar

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
  tightAngle: {
    text: 'Kamu memotong nyaris sejajar garis gawang. Sudutnya sangat sempit, tapi {gk} harus buru-buru menyesuaikan posisi.',
    choices: [
      { label: 'Tembak sudut sempit', stat: 'shooting', diff: 62, ok: 'Kamu menemukan celah kecil dan melepaskan tembakan.', fail: 'Sudutnya terlalu sempit, {gk} menutupnya dengan mudah.', next: { shot: 6 } },
      { label: 'Cutback ke {mate} di tengah', stat: 'passing', diff: 52, ok: 'Umpan mendatar yang sulit dibaca bek, {mate} datang dengan ruang.', fail: 'Umpanmu kena kaki {def} yang menjaga area dekat.', next: { assist: 0.42 } },
      { label: 'Putar balik cari sudut lebih baik', stat: 'dribbling', diff: 58, ok: 'Kamu berhasil membuka sedikit ruang untuk sudut yang lebih baik.', fail: 'Kamu terjebak di pojok, {def} merapat menutup semua opsi.', next: { shot: -2 } },
    ],
  },
  crowded: {
    text: 'Bola liar jatuh di tengah kerumunan pemain di kotak penalti. Kaki-kaki saling berebut.',
    choices: [
      { label: 'Paksa tembak lewat kerumunan', stat: 'shooting', diff: 64, ok: 'Kamu menemukan sedikit celah dan melepaskan tembakan.', fail: 'Tembakanmu mengenai salah satu pemain di depanmu.', next: { shot: 8 } },
      { label: 'Lepas cepat ke {mate} yang lebih terbuka', stat: 'passing', diff: 50, ok: 'Kamu melepas bola secepatnya sebelum dikepung, {mate} menerimanya dengan ruang lebih baik.', fail: 'Umpanmu tersangkut di antara kaki-kaki pemain.', next: { assist: 0.3 } },
      { label: 'Lindungi bola, tunggu ruang terbuka', stat: 'physical', diff: 55, ok: 'Kamu berhasil menahan bola sampai sedikit ruang terbuka.', fail: '{def} berhasil menyelipkan kaki dan merebut bola.', next: { step: 'control' } },
    ],
  },
  keeperRush: {
    text: '{gk} nekat maju jauh dari garis gawang untuk memotong bola sebelum kamu tiba.',
    choices: [
      { label: 'Cungkil bola lewat atas kepala {gk}', stat: 'shooting', diff: 66, ok: 'Cungkilan yang sempurna! Bola melambung lewat {gk} yang sudah terlanjur maju.', fail: 'Cungkilanmu terlalu tinggi dan melambung ke luar.', next: { end: 'miss' } },
      { label: 'Bawa bola putar mengelabui {gk}', stat: 'dribbling', diff: 62, ok: 'Kamu memutar tubuh secepat kilat dan melewati {gk} yang sudah keluar jauh.', fail: '{gk} berhasil menepis bola sebelum kamu sempat memutarnya.', next: { end: 'miss' } },
      { label: 'Operan pendek ke {mate} yang lebih terbuka', stat: 'passing', diff: 54, ok: 'Kamu melihat {mate} di posisi lebih baik dan melepas umpan tepat waktu.', fail: 'Umpanmu terlambat, {gk} sudah keburu menyapu bola.', next: { assist: 0.5 } },
    ],
  },
  lastDefender: {
    text: 'Cuma tersisa satu bek, {def}, yang mengejar dari belakang. Di depan hanya ada ruang kosong dan {gk}.',
    choices: [
      { label: 'Adu cepat, jangan menoleh', stat: 'pace', diff: 58, ok: 'Larimu lebih cepat, {def} tertinggal jauh di belakang!', fail: '{def} berhasil menyusul dan menyenggol bola keluar jalur.', next: { step: 'oneOne' } },
      { label: 'Potong ke dalam sebelum ketutup', stat: 'dribbling', diff: 56, ok: 'Satu potongan tajam ke dalam, {def} kehilangan keseimbangan.', fail: '{def} berhasil membaca arahmu dan menutup jalur.', next: { step: 'oneOne' } },
      { label: 'Umpan ke {mate} sebelum dikejar', stat: 'passing', diff: 52, ok: 'Kamu melepas umpan tepat sebelum {def} tiba, {mate} kini yang lolos.', fail: 'Umpanmu sedikit terlalu keras untuk dikontrol {mate}.', next: { assist: 0.46 } },
    ],
  },
  looseAerial: {
    text: 'Duel udara menghasilkan bola kedua yang jatuh bebas di area kotak penalti.',
    choices: [
      { label: 'Kejar dan sambar cepat', stat: 'pace', diff: 54, ok: 'Kamu lebih dulu sampai dan langsung siap menembak.', fail: '{def} lebih dulu menguasai bola kedua itu.', next: { shot: -3 } },
      { label: 'Kontrol dengan tenang', stat: 'dribbling', diff: 52, ok: 'Kamu meredam bola dengan tenang di tengah kekacauan.', fail: 'Bola memantul terlalu jauh dari jangkauanmu.', next: { step: 'control' } },
      { label: 'Sundul lanjut ke gawang', stat: 'physical', diff: 58, ok: 'Kamu langsung menyundul bola kedua itu ke arah gawang!', fail: 'Sundulanmu tidak cukup kuat menjangkau gawang.', next: { shot: 2, kind: 'header' } },
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
          { label: 'Sundul ke ruang kosong', stat: 'physical', diff: 58, ok: 'Kamu menang duel udara, bola jatuh di depanmu.', fail: '{def} menang duel udara.', next: { step: 'looseAerial' } },
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
          { label: 'Lari ke ruang kosong', stat: 'pace', diff: 58, ok: 'Umpan terobosan sempurna, kamu berlari bebas.', fail: 'Kamu offside! Bendera terangkat.', next: { step: 'keeperRush' } },
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
          { label: 'Voli salto membelakangi gawang!', ok: 'Bola datang dari belakangmu dan kamu memilih melompat membalikkan badan.', next: { shot: 4, kind: 'acrobatic' } },
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
          { label: 'Kontrol dulu, baru tembak', stat: 'dribbling', diff: 55, ok: 'Satu sentuhan dan kamu siap menembak.', fail: 'Bola membentur tulang keringmu dan terlepas.', next: { step: 'crowded' } },
          { label: 'Coba salto akrobatik!', ok: 'Kamu memutuskan mengambil risiko dan melompat ke udara.', next: { shot: 0, kind: 'acrobatic' } },
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
          { label: 'Terima umpan lalu terus berlari', stat: 'pace', diff: 58, ok: 'Kamu meninggalkan semua orang.', fail: 'Umpanmu terlalu lambat diterima, bek {opp} sempat menutup.', next: { step: 'lastDefender' } },
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
          { label: 'Cut inside dan tembak', stat: 'dribbling', diff: 58, ok: 'Kamu memotong ke dalam dengan tajam.', fail: '{def} menutup ruang, tembakan urung.', next: { step: 'tightAngle' } },
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
  // ---- momen non-tembakan: menjaga bola, bertahan, duel, dst ----
  {
    id: 'holdup', title: 'Hold-up play', weight: 3, tags: ['target'],
    start: 'holdup',
    steps: {
      holdup: {
        text: 'Umpan panjang mendarat di kakimu dengan {def} menempel ketat dari belakang. Timmu butuh waktu naik.',
        choices: [
          { label: 'Lindungi bola, tunggu rekan', stat: 'physical', diff: 55, ok: 'Kamu jadi tembok, {def} tidak bisa merebut apa pun.', fail: '{def} berhasil mendorongmu dan merebut bola.', next: { step: 'holdup2' } },
          { label: 'Lay-off cepat ke {mate}', stat: 'passing', diff: 52, ok: 'Satu sentuhan sempurna, bola sudah di kaki {mate} yang bergerak maju.', fail: 'Sentuhanmu kurang terarah, bola melenceng dari {mate}.', next: { assist: 0.32 } },
          { label: 'Putar badan langsung', stat: 'dribbling', diff: 62, ok: 'Kamu berputar cepat dan lolos dari kawalan {def}!', fail: '{def} membaca gerakanmu dan bola tersapu.', next: { step: 'control' } },
        ],
      },
      holdup2: {
        text: 'Bola aman di kakimu, {mate} sudah mulai naik membantu.',
        choices: [
          { label: 'Umpan tarik ke {mate}', stat: 'passing', diff: 54, ok: 'Umpan yang matang, {mate} menerimanya dengan ruang.', fail: 'Umpanmu terlalu keras.', next: { assist: 0.36 } },
          { label: 'Coba balik badan dan tembak', stat: 'dribbling', diff: 60, ok: 'Kamu berhasil membalik badan, ruang tembak terbuka!', fail: '{def} tetap rapat dan memblok putaranmu.', next: { shot: 2 } },
        ],
      },
    },
  },
  {
    id: 'duel_fisik', title: 'Duel fisik', weight: 3,
    start: 'duel',
    steps: {
      duel: {
        text: '{def} datang menekel keras dari samping, berebut posisi denganmu untuk bola yang sedang bergulir.',
        choices: [
          { label: 'Lindungi badan, menangkan posisi', stat: 'physical', diff: 58, ok: 'Kamu lebih kuat! Bola tetap jadi milikmu dan {def} tersungkur.', fail: '{def} menang duel dan bola direbut.', next: { step: 'control' } },
          { label: 'Hindari duel, lepas lebih dulu', stat: 'pace', diff: 56, ok: 'Kamu lebih cepat melepas bola sebelum tekel mendarat.', fail: 'Tekel {def} datang lebih dulu dan mengenai bola sekaligus kakimu.', next: { assist: 0.3 }, failNext: { foul: 'hard' } },
          { label: 'Berdiri tegak, minta pelanggaran', stat: 'mental', diff: 50, ok: 'Wasit melihat jelas dan meniup peluit untuk pelanggaran atasmu.', fail: 'Wasit menganggap itu duel wajar dan membiarkan permainan jalan terus.', next: { foul: 'soft' }, failNext: { end: 'lost' } },
        ],
      },
    },
  },
  {
    id: 'shielding', title: 'Melindungi bola', weight: 2,
    start: 'shield',
    steps: {
      shield: {
        text: 'Bola ada di kakimu membelakangi gawang, {def} menempel rapat menunggu kesalahan.',
        choices: [
          { label: 'Tahan sampai {mate} datang', stat: 'physical', diff: 54, ok: 'Kesabaranmu terbayar, {mate} tiba tepat waktu untuk menerima umpan.', fail: '{def} akhirnya berhasil mencuri bola dari kakimu.', next: { assist: 0.34 } },
          { label: 'Putar cepat dan lepaskan diri', stat: 'dribbling', diff: 58, ok: 'Satu putaran tajam dan kamu lolos dari kawalan!', fail: 'Putaranmu terbaca, bola tersapu bersih.', next: { step: 'control' } },
        ],
      },
    },
  },
  {
    id: 'one_two', title: 'One-two cepat', weight: 3, tags: ['technician'],
    start: 'ot',
    steps: {
      ot: {
        text: 'Kamu mengumpan pendek ke {mate} sambil terus berlari mencari ruang kosong di belakang bek.',
        choices: [
          { label: 'Lari secepat mungkin, minta bola balik', stat: 'pace', diff: 58, ok: '{mate} langsung mengembalikan bola satu sentuhan ke jalur larimu!', fail: 'Lajumu kalah cepat, bek sempat menutup ruang.', next: { step: 'oneOne' } },
          { label: 'Berjalan santai, kelabui lawan', stat: 'mental', diff: 56, ok: 'Gerakan tipuanmu berhasil, bek salah membaca arah larimu.', fail: 'Bek tidak terpancing dan tetap menjagamu ketat.', next: { step: 'oneOne' } },
        ],
      },
    },
  },
  {
    id: 'decoy', title: 'Menarik perhatian bek', weight: 2, tags: ['speedster'],
    start: 'decoy',
    steps: {
      decoy: {
        text: 'Kamu sengaja berlari ke sisi kanan untuk menarik {def}, membuka ruang besar di tengah untuk {mate}.',
        choices: [
          { label: 'Terus berlari menjauh', stat: 'pace', diff: 54, ok: '{def} termakan umpan gerak dan {mate} menemukan ruang luas!', fail: '{def} tidak terpancing dan tetap menjaga area tengah.', next: { assist: 0.4 } },
          { label: 'Berhenti mendadak, minta bola', stat: 'mental', diff: 58, ok: 'Perubahan arahmu mengejutkan {def}, bola datang ke kakimu dengan ruang.', fail: '{def} tetap rapat mengikuti perubahan arahmu.', next: { step: 'control' } },
        ],
      },
    },
  },
  {
    id: 'win_possession', title: 'Bola lepas', weight: 3,
    start: 'wp',
    steps: {
      wp: {
        text: 'Umpan lawan meleset dan bola lepas kontrol di dekatmu. Ini kesempatan untuk merebutnya kembali.',
        choices: [
          { label: 'Sergap dan rebut bola', stat: 'pace', diff: 55, ok: 'Kamu tiba lebih dulu dan merebut bola untuk timmu!', fail: 'Bek lawan lebih dulu menguasai bola kembali.', next: { end: 'win' } },
          { label: 'Tekan bersama {mate}', stat: 'mental', diff: 52, ok: 'Pressing kalian berhasil memaksa lawan kehilangan bola lagi.', fail: 'Lawan berhasil lolos dari tekanan kalian berdua.', next: { end: 'win' } },
        ],
      },
    },
  },
  {
    id: 'debat', title: 'Ketegangan di lapangan', weight: 2,
    start: 'db',
    steps: {
      db: {
        text: '{def} menekelmu keras lalu balas menatap tajam sambil bicara sesuatu yang tidak enak didengar. Beberapa pemain mulai mendekat.',
        choices: [
          { label: 'Balas dengan kata-kata', ok: 'Adu mulut singkat sebelum wasit melerai. Adrenalinmu naik.', fail: 'Wasit mencatat namamu karena dianggap memancing keributan.', stat: 'mental', diff: 46, next: { end: 'control' }, failNext: { end: 'neutral' } },
          { label: 'Diam, jalan menjauh', ok: 'Kamu memilih kepala dingin dan berjalan menjauh. Rekan-rekan menghargai sikapmu.', next: { end: 'neutral' } },
          { label: 'Minta wasit turun tangan', ok: 'Wasit segera melerai dan memperingatkan {def}.', stat: 'mental', diff: 40, fail: 'Wasit menganggap situasi sudah selesai dan tidak bertindak.', next: { foul: 'soft' }, failNext: { end: 'neutral' } },
        ],
      },
    },
  },
];

// Template khusus menit-menit akhir (85'+), dipicu terpisah dan sengaja langka.
export const LATE_MOMENTS: MTemplate[] = [
  {
    id: 'late_decider', title: 'Peluang di menit akhir', weight: 1,
    start: 'late',
    steps: {
      late: {
        text: 'Wasit sudah bersiap meniup peluit panjang, tapi bola tiba-tiba jatuh ke areamu. Ini mungkin kesempatan terakhir.',
        choices: [
          { label: 'Tembak secepat mungkin', ok: 'Tidak ada waktu berpikir dua kali!', next: { shot: -2 } },
          { label: 'Satu sentuhan dulu, atur posisi', stat: 'dribbling', diff: 58, ok: 'Sentuhanmu tenang di tengah tekanan waktu.', fail: 'Sentuhanmu sedikit besar, {def} nyaris merebutnya.', next: { shot: -6 } },
          { label: 'Umpan ke {mate} yang lebih terbuka', stat: 'passing', diff: 54, ok: 'Umpan tenang di detik-detik akhir, {mate} dalam posisi bagus.', fail: 'Umpanmu sedikit meleset dari jangkauan {mate}.', next: { assist: 0.5 } },
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
// Tembakan akrobatik/salto. Lebih sulit, dan bisa gagal dengan cara berbeda (jatuh, tidak sampai bola).
export const SHOT_ACROBATIC: ShotOption[] = [
  { label: 'Salto (bicycle kick)', stat: 'dribbling', diff: 14, fails: { fall: 35, wide: 25, saved: 25, block: 15 } },
  { label: 'Voli langsung tanpa kontrol', stat: 'shooting', diff: 10, fails: { wide: 40, saved: 30, block: 20, fall: 10 } },
  { label: 'Tendangan gunting menyamping', stat: 'physical', diff: 12, fails: { fall: 30, wide: 30, saved: 25, block: 15 } },
];

export const SHOT_TEXT = {
  goal: ['GOOOL! Bola menghujam gawang {gk}!', 'Gol! {gk} hanya bisa menoleh melihat bola masuk.', 'Tak terbendung! Jaring gawang bergetar.', 'Masuuk! Stadion meledak!'],
  saved: ['{gk} melakukan penyelamatan gemilang!', '{gk} membaca arah dan menepisnya.', 'Refleks luar biasa dari {gk}, sedikit lagi!'],
  wide: ['Bola melebar tipis di sisi tiang.', 'Tembakanmu melambung di atas mistar.', 'Sedikit saja, bola melintas di sisi gawang.'],
  block: ['{def} menjulurkan kaki dan memblok tembakanmu!', 'Tembakan tertahan badan {def}.'],
  post: ['Tiang! Bola membentur tiang dan keluar.', 'Mistar gawang bergetar! Nyaris sekali.'],
  fall: ['Kamu kehilangan keseimbangan dan jatuh sebelum bola tersentuh sempurna.', 'Percobaanmu berakhir dengan kamu tersungkur di rumput, bola melintas begitu saja.', 'Kakimu tidak sampai menjangkau bola, kamu terjatuh dengan canggung.'],
} as const;