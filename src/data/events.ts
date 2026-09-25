// Event di luar lapangan (kehidupan, latihan, media, keluarga, dll).
// Menambah konten = menambah objek baru ke array EVENTS. Tidak perlu mengubah engine.
//
// Field penting:
//   weight    bobot kemunculan acak (makin besar makin sering)
//   cond      syarat event boleh muncul
//   cooldown  minimal berapa pekan sebelum event yang sama muncul lagi
//   once      hanya boleh muncul sekali seumur karier
//   chainOnly hanya muncul lewat jadwal event lain (event berantai)
//   outcomes  beberapa hasil dengan peluang p (jumlah p tidak harus 1, akan dinormalisasi)
import type { Attrs, Club, GameState, Hero, Player, RelKey } from '../engine/types';

export interface Effects {
  morale?: number;
  fitness?: number;
  form?: number;
  money?: number; // €K
  fame?: number;
  rel?: Partial<Record<RelKey, number>>;
  attr?: Partial<Attrs>;
  injuryWeeks?: number;
  flag?: Record<string, number>; // nama flag -> lama (pekan)
  schedule?: { id: string; weeks: number }[];
  transferRequest?: boolean;
  contract?: { years: number; salaryMult: number };
  special?: 'newManager' | 'cap';
}
export interface Outcome {
  p?: number;
  text: string;
  fx: Effects;
}
export interface EventChoice {
  label: string;
  requires?: (c: Ctx) => boolean;
  outcomes: Outcome[];
}
export interface Ctx {
  g: GameState;
  h: Hero;
  club: Club;
  rival: Player | null;
  has: (flag: string) => boolean;
  ovr: number;
}
export interface EventDef {
  id: string;
  title: string;
  weight: number;
  cooldown?: number;
  once?: boolean;
  chainOnly?: boolean;
  cond?: (c: Ctx) => boolean;
  text: string | ((c: Ctx) => string);
  choices: EventChoice[];
}

const senior = (c: Ctx) => c.h.status === 'senior';
const academy = (c: Ctx) => c.h.status === 'academy';

export const EVENTS: EventDef[] = [
  // ---------- AKADEMI ----------
  {
    id: 'hari_pertama', title: 'Hari pertama di akademi', weight: 20, once: true, cond: (c) => academy(c) && c.h.age <= 16,
    text: (c) => `Kamu berdiri di depan gerbang akademi ${c.club.name} sambil menenteng tas ransel. Pemain-pemain lain saling melirik, menilai siapa saingan baru mereka.`,
    choices: [
      { label: 'Sapa semua orang dengan percaya diri', outcomes: [{ p: 0.6, text: 'Beberapa anak membalas ramah. Kamu langsung dapat beberapa teman baru.', fx: { rel: { team: 6 }, morale: 4 } }, { p: 0.4, text: 'Sikapmu dianggap sok kenal oleh sebagian anak.', fx: { rel: { team: -2 }, morale: 1 } }] },
      { label: 'Diam dan amati situasi dulu', outcomes: [{ text: 'Kamu memilih aman. Beberapa anak penasaran tapi tak mendekat.', fx: { attr: { mental: 0.3 } } }] },
      { label: 'Langsung minta main tanding kecil', outcomes: [{ p: 0.5, text: 'Kamu tampil bagus di tanding kecil itu. Semua orang memperhatikanmu.', fx: { fame: 1, rel: { team: 4 }, morale: 5 } }, { p: 0.5, text: 'Kamu terlalu bersemangat dan malah kelihatan kaku.', fx: { morale: -2 } }] },
    ],
  },
  {
    id: 'teman_sekamar', title: 'Teman sekamar baru', weight: 12, once: true, cond: (c) => academy(c) && c.h.age <= 17,
    text: 'Kamu ditempatkan sekamar dengan pemain lain di asrama. Dia sedang menata barang-barangnya sambil memutar musik keras.',
    choices: [
      { label: 'Ajak ngobrol dan kenalan', outcomes: [{ text: 'Ternyata dia asyik. Kalian langsung akrab dan sering belajar bareng.', fx: { rel: { team: 8 }, morale: 5 } }] },
      { label: 'Minta dia mengecilkan volume musik', outcomes: [{ p: 0.5, text: 'Dia minta maaf dan langsung mengecilkan volumenya. Situasi tetap nyaman.', fx: { morale: 2 } }, { p: 0.5, text: 'Dia agak tersinggung. Beberapa hari suasana kamar terasa canggung.', fx: { rel: { team: -3 }, morale: -2 } }] },
      { label: 'Diam saja, pakai headphone', outcomes: [{ text: 'Kamu memilih tidak ambil pusing dan fokus istirahat.', fx: { attr: { mental: 0.3 } } }] },
    ],
  },
  {
    id: 'uang_saku', title: 'Uang saku pertama', weight: 10, once: true, cond: (c) => academy(c) && c.h.age === 16,
    text: 'Pengurus akademi memberimu uang saku bulanan pertama, jumlahnya tidak banyak tapi ini uang hasil kerja kerasmu sendiri.',
    choices: [
      { label: 'Simpan semuanya', outcomes: [{ text: 'Kamu menabung dengan disiplin sejak awal.', fx: { money: 3, morale: 2 } }] },
      { label: 'Traktir teman sekamar makan', outcomes: [{ text: 'Kalian makan bareng sambil ngobrol panjang. Momen sederhana yang berkesan.', fx: { money: -1, rel: { team: 5 }, morale: 4 } }] },
      { label: 'Kirim sebagian ke orang tua', outcomes: [{ text: 'Jumlahnya kecil, tapi ibumu menelepon dan bilang terharu.', fx: { money: -1, morale: 6 } }] },
    ],
  },
  {
    id: 'nonton_tim_senior', title: 'Menonton tim senior berlatih', weight: 10, once: true, cond: (c) => academy(c) && c.h.age <= 17,
    text: (c) => `Dari pinggir lapangan, kamu diam-diam menonton sesi latihan tim senior ${c.club.short}. Intensitas dan kecepatan mereka jauh berbeda dari lapangan U-18.`,
    choices: [
      { label: 'Perhatikan gerakan striker senior baik-baik', outcomes: [{ text: 'Kamu mencatat detail kecil pergerakan tanpa bola yang belum pernah kamu sadari.', fx: { attr: { mental: 0.6 }, morale: 3 } }] },
      { label: 'Membayangkan dirimu ada di sana', outcomes: [{ text: 'Bayangan itu membakar semangatmu untuk berlatih lebih keras.', fx: { morale: 6, fitness: -2 } }] },
    ],
  },
  {
    id: 'kangen_masakan', title: 'Kangen masakan rumah', weight: 8, cooldown: 30, cond: (c) => academy(c),
    text: 'Menu kantin akademi hari ini terasa hambar. Kamu jadi kepikiran masakan rumah yang biasa kamu makan tiap hari.',
    choices: [
      { label: 'Coba masak sendiri di dapur asrama', outcomes: [{ p: 0.5, text: 'Hasilnya lumayan! Teman-teman malah ikut minta dibuatkan.', fx: { morale: 6, rel: { team: 3 } } }, { p: 0.5, text: 'Masakanmu gosong. Kalian tertawa bersama menertawakan hasilnya.', fx: { morale: 3, rel: { team: 2 } } }] },
      { label: 'Telepon ibu minta resepnya', outcomes: [{ text: 'Ibumu menjelaskan resep sambil bercerita kabar dari rumah. Kamu jadi rindu tapi juga lega.', fx: { morale: 5 } }] },
      { label: 'Tahan saja, ini bagian dari perjuangan', outcomes: [{ text: 'Kamu mengingatkan diri sendiri kenapa kamu ada di sini.', fx: { attr: { mental: 0.4 } } }] },
    ],
  },
  {
    id: 'jam_malam', title: 'Godaan jam malam', weight: 8, cooldown: 20, cond: (c) => academy(c) && c.h.age >= 16,
    text: 'Beberapa senior akademi mengajakmu keluar diam-diam setelah jam malam untuk jajan di luar. Penjaga asrama biasanya tidur jam segini.',
    choices: [
      { label: 'Ikut, sekali-sekali saja', outcomes: [{ p: 0.7, text: 'Kalian berhasil kembali sebelum ketahuan. Malam yang seru dan mempererat pertemanan.', fx: { rel: { team: 5 }, morale: 4, fitness: -3 } }, { p: 0.3, text: 'Penjaga asrama memergoki kalian. Kamu kena teguran dari pelatih.', fx: { rel: { manager: -5 }, morale: -3 } }] },
      { label: 'Menolak, ikuti aturan', outcomes: [{ text: 'Kamu tetap di kamar. Sebagian menganggapmu terlalu kaku, tapi kamu tenang.', fx: { attr: { mental: 0.3 }, rel: { manager: 1 } } }] },
    ],
  },
  {
    id: 'asrama_rindu', title: 'Rindu rumah', weight: 10, once: true, cond: (c) => academy(c) && c.h.age <= 16,
    text: (c) => `Malam pertama di asrama ${c.club.short}. Kamu menatap langit-langit dan teringat rumah, masakan ibu, dan teman-teman lamamu.`,
    choices: [
      { label: 'Telepon ibu dan ceritakan semuanya', outcomes: [{ text: 'Ibumu menyemangatimu sampai larut. Kamu tidur lebih tenang.', fx: { morale: 8, fitness: -2 } }] },
      { label: 'Ajak teman sekamar main game', outcomes: [{ text: 'Kalian tertawa sampai lupa waktu. Ikatan kalian makin erat.', fx: { morale: 4, rel: { team: 6 }, fitness: -4 } }] },
      { label: 'Tidur cepat, besok latihan pagi', outcomes: [{ text: 'Kamu bangun segar, tapi terasa sedikit sepi.', fx: { morale: -2, fitness: 4 } }] },
    ],
  },
  {
    id: 'ujian_sekolah', title: 'Ujian sekolah vs latihan', weight: 6, cooldown: 24, cond: academy,
    text: 'Ujian sekolah jatuh di pekan yang sama dengan sesi latihan tambahan. Guru dan pelatih sama-sama menunggu jawabanmu.',
    choices: [
      { label: 'Belajar untuk ujian', outcomes: [{ text: 'Nilaimu bagus. Orang tuamu bangga, meski pelatih agak kecewa.', fx: { morale: 5, rel: { manager: -2 } } }] },
      { label: 'Ikut latihan tambahan', outcomes: [{ p: 0.6, text: 'Latihanmu tajam. Nilai ujianmu pas-pasan, tapi masih lolos.', fx: { attr: { shooting: 0.5 }, morale: -1 } }, { p: 0.4, text: 'Nilai ujianmu jeblok dan kamu dipanggil orang tua.', fx: { morale: -6, attr: { shooting: 0.5 } } }] },
      { label: 'Bagi waktu sebaik mungkin', outcomes: [{ text: 'Kamu tidur larut, tapi dua-duanya beres.', fx: { fitness: -8, morale: 2, attr: { mental: 0.5 } } }] },
    ],
  },
  {
    id: 'pengamat_bakat', title: 'Ada pengamat di tribun', weight: 5, cooldown: 30, cond: (c) => academy(c) && c.ovr >= 46,
    text: 'Seorang pria dengan buku catatan duduk sendirian di tribun U-18. Kata rekanmu, dia pencari bakat klub besar.',
    choices: [
      { label: 'Tampil sepenuh hati pekan ini', outcomes: [{ p: 0.5, text: 'Kamu bermain penuh semangat. Pria itu mencatat sesuatu dan tersenyum.', fx: { fame: 2, form: 6, fitness: -5 } }, { p: 0.5, text: 'Kamu terlalu memaksakan diri dan tegang di lapangan.', fx: { form: -6, morale: -3 } }] },
      { label: 'Main seperti biasa', outcomes: [{ text: 'Kamu tidak mengubah apa pun. Tenang dan konsisten.', fx: { fame: 1, attr: { mental: 0.5 } } }] },
    ],
  },
  {
    id: 'ritual_pemain_baru', title: 'Ritual pemain baru', weight: 5, once: true, cond: (c) => senior(c) && c.h.age <= 19,
    text: 'Pemain senior menyuruhmu membawa semua bola latihan dan bernyanyi di depan seluruh tim. Ini tradisi kata mereka.',
    choices: [
      { label: 'Nyanyi dengan percaya diri', outcomes: [{ p: 0.65, text: 'Suaramu memang pas-pasan, tapi seisi ruang ganti tertawa terbahak dan menerimamu.', fx: { rel: { team: 10 }, morale: 4 } }, { p: 0.35, text: 'Kamu lupa liriknya di tengah lagu. Tetap lucu, dan viral di grup WhatsApp tim.', fx: { rel: { team: 5 }, morale: -1 } }] },
      { label: 'Menolak dengan sopan', outcomes: [{ text: 'Sebagian rekan menganggapmu sombong. Suasana sedikit dingin.', fx: { rel: { team: -6 }, morale: -2 } }] },
    ],
  },

  // ---------- LATIHAN & KARIER ----------
  {
    id: 'latihan_ekstra', title: 'Tawaran latihan tambahan', weight: 7, cooldown: 8, cond: (c) => c.h.injuryWeeks === 0,
    text: (c) => `${c.club.manager.name} menepukmu setelah sesi latihan. "Mau tambahan sesi sore? Tidak wajib."`,
    choices: [
      { label: 'Ikut, siap kerja keras', outcomes: [{ p: 0.75, text: 'Sore yang melelahkan tapi terasa berguna. Sentuhanmu makin halus.', fx: { attr: { shooting: 0.5, dribbling: 0.3 }, fitness: -10, rel: { manager: 4 } } }, { p: 0.25, text: 'Kamu terlalu lelah dan otot pahamu menegang.', fx: { fitness: -14, rel: { manager: 3 }, injuryWeeks: 1 } }] },
      { label: 'Pulang dan istirahat', outcomes: [{ text: 'Kamu tidur siang dan makan enak. Badan pulih.', fx: { fitness: 8, morale: 2 } }] },
    ],
  },
  {
    id: 'kapten_mentor', title: 'Tawaran bimbingan dari senior', weight: 5, cooldown: 40, cond: (c) => c.h.age <= 23,
    text: 'Sang kapten, mantan striker, memanggilmu. "Aku lihat cara kamu bergerak. Ikut aku ekstra latihan finishing tiap sore?"',
    choices: [
      { label: 'Terima dengan senang hati', outcomes: [{ text: 'Dua bulan ke depan kamu belajar banyak dari pengalamannya.', fx: { flag: { mentor: 8 }, rel: { team: 5, manager: 2 }, fitness: -3 } }] },
      { label: 'Sopan menolak, mau berkembang sendiri', outcomes: [{ text: 'Sang kapten mengangguk pelan. Kamu merasa sedikit tidak enak.', fx: { rel: { team: -2 }, attr: { mental: 0.4 } } }] },
    ],
  },
  {
    id: 'pelatih_pribadi', title: 'Pelatih pribadi', weight: 4, cooldown: 40, cond: (c) => senior(c) && c.h.money >= 200,
    text: 'Agenmu menawarkan pelatih finishing pribadi untuk beberapa bulan. Tarifnya tidak murah.',
    choices: [
      { label: 'Bayar (€200K)', outcomes: [{ text: 'Sesi pribadi mulai membuahkan hasil. Detail kecil jadi lebih tajam.', fx: { money: -200, flag: { trainer: 12 }, attr: { shooting: 0.4 } } }] },
      { label: 'Tidak, cukup latihan klub', outcomes: [{ text: 'Uangmu aman. Kamu tetap mengandalkan pelatih klub.', fx: { morale: 1 } }] },
    ],
  },
  {
    id: 'cedera_ringan', title: 'Lutut terasa aneh', weight: 4, cooldown: 12, cond: (c) => c.h.injuryWeeks === 0,
    text: 'Saat sprint di sesi latihan, lututmu terasa tidak enak. Belum sakit, tapi ada yang janggal.',
    choices: [
      { label: 'Berhenti dan periksa ke tim medis', outcomes: [{ p: 0.7, text: 'Hanya kelelahan otot. Kamu diminta istirahat beberapa hari.', fx: { fitness: 5, morale: -1 } }, { p: 0.3, text: 'Dokter menemukan cedera ringan yang untung terdeteksi dini.', fx: { injuryWeeks: 1, rel: { manager: 2 } } }] },
      { label: 'Lanjutkan latihan, ah paling cuma kaku', outcomes: [{ p: 0.55, text: 'Rasa janggalnya hilang sendiri.', fx: { attr: { mental: 0.3 } } }, { p: 0.45, text: 'Lututmu benar-benar bermasalah. Kamu terpaksa absen.', fx: { injuryWeeks: 3, morale: -6 } }] },
    ],
  },
  {
    id: 'paceklik_gol', title: 'Paceklik gol', weight: 12, cooldown: 12, cond: (c) => senior(c) && c.h.goalDrought >= 5,
    text: (c) => `Sudah ${c.h.goalDrought} pertandingan tanpa gol. Kolom komentar mulai ramai dan namamu dibahas di podcast bola.`,
    choices: [
      { label: 'Latihan finishing ekstra sendirian', outcomes: [{ p: 0.65, text: 'Ratusan tembakan di sore hari. Kepercayaan dirimu perlahan pulih.', fx: { attr: { shooting: 0.6 }, form: 8, fitness: -8 } }, { p: 0.35, text: 'Kamu terlalu memaksakan diri dan makin frustrasi.', fx: { form: -3, fitness: -10, morale: -3 } }] },
      { label: 'Bicara dengan pelatih', outcomes: [{ text: 'Pelatih menenangkanmu dan menunjukkan rekaman gerakanmu. Ada hal kecil yang harus diperbaiki.', fx: { rel: { manager: 5 }, form: 4, attr: { mental: 0.5 } } }] },
      { label: 'Abaikan komentar orang', outcomes: [{ p: 0.5, text: 'Kamu tetap tenang. Gol pasti datang.', fx: { attr: { mental: 0.5 }, morale: 1 } }, { p: 0.5, text: 'Kamu tak bisa berhenti membaca komentar jelek di malam hari.', fx: { morale: -6, form: -3 } }] },
    ],
  },
  {
    id: 'bintang_naik', title: 'Sedang on fire', weight: 10, cooldown: 10, cond: (c) => senior(c) && c.h.goalStreak >= 3,
    text: (c) => `${c.h.goalStreak} laga berturut-turut mencetak gol! Media menyebutmu "harapan baru" dan wartawan menunggu di gerbang latihan.`,
    choices: [
      { label: 'Layani wawancara dengan rendah hati', outcomes: [{ text: 'Kutipanmu sederhana dan disukai. Fans makin sayang.', fx: { fame: 3, rel: { media: 5, fans: 4 } } }] },
      { label: 'Fokus latihan, jangan bicara dulu', outcomes: [{ text: 'Kamu tetap bersahaja. Pelatih senang, media agak kecewa.', fx: { rel: { manager: 4, media: -3 }, form: 4 } }] },
      { label: 'Nikmati momen, upload semua ke medsos', outcomes: [{ p: 0.6, text: 'Unggahanmu ramai disukai.', fx: { fame: 4, rel: { fans: 5 }, morale: 4 } }, { p: 0.4, text: 'Kamu dikira sombong. Netizen mulai mencari-cari kesalahanmu.', fx: { fame: 3, rel: { media: -6 }, morale: 2 } }] },
    ],
  },
  {
    id: 'pelatih_bicara', title: 'Menit bermain', weight: 14, cooldown: 10, cond: (c) => senior(c) && c.h.notPlayedStreak >= 3,
    text: (c) => `Sudah ${c.h.notPlayedStreak} laga berturut-turut kamu tidak dimainkan. Kamu mulai ragu apakah ${c.club.manager.name} masih percaya padamu.`,
    choices: [
      { label: 'Temui pelatih dan minta penjelasan', outcomes: [{ p: 0.6, text: 'Pelatih menjelaskan rencananya dan janji memberi menit lebih. Kamu merasa lebih tenang.', fx: { rel: { manager: 8 }, morale: 4 } }, { p: 0.4, text: 'Pelatih tidak terkesan dengan sikap kamu.', fx: { rel: { manager: -4 }, morale: -3 } }] },
      { label: 'Minta agen mencarikan klub lain', outcomes: [{ text: 'Agenmu mulai menghubungi beberapa klub. Kabarnya bocor ke ruang ganti.', fx: { transferRequest: true, rel: { manager: -6, team: -2 } } }] },
      { label: 'Diam dan kerja keras di latihan', outcomes: [{ text: 'Kamu tak mengeluh. Kerja kerasmu diam-diam dilihat staf pelatih.', fx: { attr: { mental: 0.6 }, morale: -2, rel: { manager: 2 } } }] },
    ],
  },
  {
    id: 'kontrak_baru', title: 'Tawaran perpanjangan kontrak', weight: 30, cooldown: 100, cond: (c) => senior(c) && c.h.contract.yearsLeft <= 1 && c.g.week >= 8,
    text: (c) => `Direktur ${c.club.short} memanggilmu. Kontrakmu tinggal sisa musim ini, dan mereka menawarkan perpanjangan tiga tahun.`,
    choices: [
      { label: 'Tanda tangan sekarang', outcomes: [{ text: 'Kontrak baru resmi. Tidak ada drama.', fx: { contract: { years: 3, salaryMult: 1.15 }, rel: { manager: 3, fans: 3 }, morale: 4 } }] },
      { label: 'Minta gaji lebih besar', outcomes: [{ p: 0.55, text: 'Setelah negosiasi alot, klub mengiyakan permintaanmu.', fx: { contract: { years: 3, salaryMult: 1.4 }, morale: 6 } }, { p: 0.45, text: 'Klub menarik tawarannya. Kamu akan bebas transfer di akhir musim.', fx: { morale: -4, rel: { manager: -3 } } }] },
      { label: 'Tunda, lihat opsi lain di akhir musim', outcomes: [{ text: 'Kamu memilih menunggu. Agenmu mulai menjajaki pasar.', fx: { rel: { agent: 4 }, morale: 0 } }] },
    ],
  },
  {
    id: 'pelatih_baru', title: 'Pelatih dipecat', weight: 2, cooldown: 100, cond: (c) => senior(c) && c.g.week >= 8 && c.g.week <= 28,
    text: (c) => `Hasil buruk membuat manajemen memecat ${c.club.manager.name}. Pelatih baru akan datang dan semua pemain harus membuktikan diri lagi.`,
    choices: [{ label: 'Kita lihat siapa yang datang', outcomes: [{ text: 'Sebuah lembaran baru. Semua orang mulai dari nol di mata pelatih baru.', fx: { special: 'newManager', morale: -2 } }] }],
  },
  {
    id: 'gaji_telat', title: 'Gaji terlambat', weight: 5, cooldown: 40, cond: (c) => senior(c) && c.club.budget < 9000,
    text: 'Sudah dua bulan gaji belum cair. Rekan-rekan mulai berbisik di ruang ganti dan ada yang bicara soal mogok latihan.',
    choices: [
      { label: 'Sabar, percaya manajemen', outcomes: [{ text: 'Gaji akhirnya cair sebagian. Kamu dianggap pemain yang setia.', fx: { rel: { manager: 4, fans: 3 }, money: -20, morale: -3 } }] },
      { label: 'Ikut aksi protes bersama tim', outcomes: [{ text: 'Tekanan tim berhasil. Manajemen berjanji melunasi.', fx: { rel: { team: 8, manager: -3 }, morale: 2 } }] },
      { label: 'Minta agen cari solusi', outcomes: [{ text: 'Agenmu bergerak cepat, tapi hubungan dengan klub jadi tegang.', fx: { rel: { agent: 5, manager: -4 } } }] },
    ],
  },

  // ---------- TIMNAS ----------
  {
    id: 'timnas_u19', title: 'Panggilan Timnas U-19', weight: 25, once: true, cond: (c) => c.h.age <= 19 && c.ovr >= 52,
    text: 'Surat panggilan datang! Timnas U-19 memanggilmu untuk pemusatan latihan dan laga uji coba.',
    choices: [
      { label: 'Terima dengan bangga', outcomes: [{ p: 0.6, text: 'Kamu bermain 60 menit dan mencetak gol di laga uji coba. Nama kamu mulai dikenal.', fx: { special: 'cap', fame: 4, morale: 8, rel: { fans: 5 } } }, { p: 0.4, text: 'Kamu bermain 30 menit tanpa banyak menyentuh bola, tapi pengalamannya berharga.', fx: { special: 'cap', fame: 2, morale: 4, attr: { mental: 0.5 } } }] },
    ],
  },
  {
    id: 'timnas_senior', title: 'Panggilan Timnas senior', weight: 12, cooldown: 24, cond: (c) => senior(c) && c.ovr >= 66 && c.h.age >= 18,
    text: 'Pelatih timnas menelepon langsung. "Kami butuh striker dengan performa seperti kamu. Siap bergabung?"',
    choices: [
      { label: 'Siap membela Merah Putih', outcomes: [{ p: 0.5, text: 'Stadion penuh dan lagu kebangsaan membuat bulu kuduk berdiri. Kamu menyumbang gol.', fx: { special: 'cap', fame: 6, morale: 10, rel: { fans: 6, media: 4 }, fitness: -8 } }, { p: 0.5, text: 'Kamu bermain di bawah tekanan besar dan belajar banyak dari senior.', fx: { special: 'cap', fame: 3, morale: 4, attr: { mental: 0.6 }, fitness: -8 } }] },
      { label: 'Minta izin istirahat karena kelelahan', outcomes: [{ text: 'Federasi kecewa, tapi memahami. Fans terbelah.', fx: { rel: { fans: -5, media: -4 }, fitness: 8 } }] },
    ],
  },

  // ---------- MEDIA, UANG, GAYA HIDUP ----------
  {
    id: 'pesta', title: 'Undangan pesta', weight: 7, cooldown: 14, cond: (c) => c.h.age >= 17 && c.h.injuryWeeks === 0,
    text: 'Beberapa rekan mengajakmu ke sebuah pesta ulang tahun malam Jumat. Pertandingan masih akhir pekan.',
    choices: [
      { label: 'Ikut dan bersenang-senang', outcomes: [{ p: 0.5, text: 'Malam yang seru. Besok pagi kepalamu berat.', fx: { morale: 8, fitness: -10, flag: { hangover: 2 }, rel: { team: 4 } } }, { p: 0.5, text: 'Malam yang seru, tapi seseorang merekammu dan mengunggahnya.', fx: { morale: 8, fitness: -10, flag: { hangover: 2 }, schedule: [{ id: 'video_bocor', weeks: 1 }] } }] },
      { label: 'Datang sebentar lalu pulang', outcomes: [{ text: 'Kamu muncul, foto bareng, lalu pulang sebelum tengah malam.', fx: { morale: 2, rel: { team: 1 } } }] },
      { label: 'Menolak, fokus pertandingan', outcomes: [{ text: 'Kamu tidur cepat. Sedikit merasa ketinggalan, tapi badan segar.', fx: { fitness: 5, morale: -1, rel: { manager: 1 } } }] },
    ],
  },
  {
    id: 'video_bocor', title: 'Video pesta bocor', weight: 0, chainOnly: true,
    text: 'Video kamu di pesta viral di media sosial. Akun gosip bola membahasnya, dan pelatih sudah menonton.',
    choices: [
      { label: 'Minta maaf secara terbuka', outcomes: [{ text: 'Permintaan maafmu diterima. Netizen bahkan memuji kejujuranmu.', fx: { rel: { media: 2, manager: 1, fans: 2 }, morale: -1 } }] },
      { label: 'Bantah, bilang itu video lama', outcomes: [{ p: 0.4, text: 'Beberapa orang percaya. Isu mereda sendiri.', fx: {} }, { p: 0.6, text: 'Seseorang menemukan bukti tanggalnya. Kamu makin dicap pembohong.', fx: { rel: { media: -8, fans: -4, manager: -4 } } }] },
      { label: 'Diam saja', outcomes: [{ text: 'Beberapa hari kemudian topiknya bergeser ke selebriti lain.', fx: { rel: { media: -2 } } }] },
    ],
  },
  {
    id: 'wawancara', title: 'Permintaan wawancara', weight: 6, cooldown: 12, cond: (c) => c.h.fame >= 12,
    text: 'Seorang wartawan olahraga ingin mewawancaraimu. Ia terkenal suka memancing pertanyaan sensitif.',
    choices: [
      { label: 'Terima, jawab dengan hati-hati', outcomes: [{ text: 'Wawancaramu profesional dan rapi.', fx: { fame: 2, rel: { media: 5 } } }] },
      { label: 'Terima, bicara blak-blakan', outcomes: [{ p: 0.5, text: 'Jawaban jujurmu jadi kutipan besar dan dipuji.', fx: { fame: 4, rel: { media: 3, fans: 4 } } }, { p: 0.5, text: 'Ucapanmu dipelintir jadi headline yang memancing keributan.', fx: { fame: 3, rel: { media: -6, manager: -4 } } }] },
      { label: 'Tolak, fokus main', outcomes: [{ text: 'Media sedikit kesal, tapi pelatih senang.', fx: { rel: { media: -3, manager: 3 } } }] },
    ],
  },
  {
    id: 'viral', title: 'Momen viral', weight: 5, cooldown: 14, cond: (c) => c.h.fame >= 8,
    text: 'Sebuah klip dirimu saat latihan menyebar di media sosial. Ribuan orang menontonnya dan menunggu tanggapanmu.',
    choices: [
      { label: 'Balas dengan humor', outcomes: [{ p: 0.65, text: 'Candaanmu disukai banyak orang.', fx: { fame: 3, rel: { fans: 5 } } }, { p: 0.35, text: 'Candaanmu dianggap tidak sopan. Ada yang menyerangmu.', fx: { fame: 2, rel: { media: -4 } } }] },
      { label: 'Ucapkan terima kasih dengan rendah hati', outcomes: [{ text: 'Sikapmu dipuji.', fx: { fame: 2, rel: { fans: 3, media: 2 } } }] },
      { label: 'Abaikan', outcomes: [{ text: 'Kamu tidak menanggapinya. Viralnya cepat surut.', fx: {} }] },
    ],
  },
  {
    id: 'sponsor', title: 'Tawaran sponsor', weight: 5, cooldown: 30, cond: (c) => senior(c) && c.h.fame >= 22,
    text: 'Sebuah merek sepatu lokal menawarimu kontrak endorsement. Agenmu bilang kamu bisa menunggu tawaran yang lebih besar.',
    choices: [
      { label: 'Terima sekarang', outcomes: [{ text: 'Uang tambahan yang lumayan dan iklan pertamamu.', fx: { money: 60, fame: 3, rel: { agent: 2 } } }] },
      { label: 'Tunggu tawaran lebih besar', outcomes: [{ text: 'Agenmu mulai bernegosiasi dengan merek lain.', fx: { schedule: [{ id: 'sponsor_besar', weeks: 4 }] } }] },
      { label: 'Tolak, fokus main dulu', outcomes: [{ text: 'Kamu menjaga fokus. Agenmu menghela napas.', fx: { rel: { manager: 2, agent: -3 } } }] },
    ],
  },
  {
    id: 'sponsor_besar', title: 'Tawaran yang lebih besar', weight: 0, chainOnly: true,
    text: 'Agenmu menelepon dengan nada senang. Ada merek internasional yang tertarik.',
    choices: [
      { label: 'Ambil kontraknya', outcomes: [{ p: 0.6, text: 'Kesepakatan besar! Wajahmu mulai muncul di papan reklame.', fx: { money: 220, fame: 6, rel: { agent: 4 } } }, { p: 0.4, text: 'Merek itu ternyata mundur di menit terakhir. Untung masih ada tawaran kecil.', fx: { money: 40, fame: 1 } }] },
      { label: 'Minta lebih tinggi lagi', outcomes: [{ p: 0.4, text: 'Mereka setuju! Negosiasimu berhasil.', fx: { money: 320, fame: 6 } }, { p: 0.6, text: 'Mereka mundur dan kesepakatan batal.', fx: { rel: { agent: -4 } } }] },
    ],
  },
  {
    id: 'mobil', title: 'Mobil impian', weight: 3, cooldown: 60, cond: (c) => senior(c) && c.h.money >= 300 && c.h.age >= 19,
    text: 'Kamu melewati dealer mobil mewah. Ada satu mobil sport yang sudah lama kamu impikan.',
    choices: [
      { label: 'Beli mobil sport', outcomes: [{ text: 'Kamu senang, tapi ada yang mulai bilang kamu boros.', fx: { money: -250, morale: 6, fame: 2, rel: { media: -3 } } }] },
      { label: 'Beli mobil biasa yang nyaman', outcomes: [{ text: 'Keputusan yang masuk akal.', fx: { money: -60, morale: 2 } }] },
      { label: 'Tabung dan bantu keluarga', outcomes: [{ text: 'Ibumu menangis bahagia.', fx: { money: -100, morale: 5, rel: { fans: 2 } } }] },
    ],
  },
  {
    id: 'investasi', title: 'Teman lama menawarkan investasi', weight: 3, cooldown: 60, cond: (c) => c.h.money >= 150,
    text: 'Teman SMP-mu, yang kini "pengusaha", mengajakmu berinvestasi di bisnis kripto ternak lele yang katanya pasti untung 300%.',
    choices: [
      { label: 'Ikut, siapa tahu jadi kaya', outcomes: [{ p: 0.85, text: 'Bisnisnya ternyata tidak jelas, uangmu hilang. Kamu belajar mahal.', fx: { money: -150, morale: -5 } }, { p: 0.15, text: 'Keajaiban terjadi! Bisnisnya benar-benar jalan.', fx: { money: 200, morale: 6 } }] },
      { label: 'Tolak dengan halus', outcomes: [{ text: 'Temanmu sedikit tersinggung. Kamu aman.', fx: { morale: 1 } }] },
      { label: 'Konsultasikan dulu ke agen', outcomes: [{ text: 'Agenmu tertawa keras lalu menolak untukmu.', fx: { rel: { agent: 3 } } }] },
    ],
  },
  {
    id: 'agen_telepon', title: 'Kabar dari agen', weight: 6, cooldown: 25, cond: (c) => senior(c) && c.h.fame >= 18 && !c.h.transferRequested,
    text: 'Agenmu bilang beberapa klub sedang memantau perkembanganmu. Ia bertanya bagaimana perasaanmu di klub sekarang.',
    choices: [
      { label: 'Aku senang di sini, fokus dulu', outcomes: [{ text: 'Agenmu paham dan menunggu.', fx: { rel: { manager: 2, agent: 1 } } }] },
      { label: 'Jajaki peluang, aku ingin naik level', outcomes: [{ text: 'Agenmu tersenyum. "Aku telepon beberapa orang."', fx: { rel: { agent: 5 }, fame: 1 } }] },
    ],
  },
  {
    id: 'ibu_datang', title: 'Keluarga datang menonton', weight: 4, cooldown: 40,
    text: 'Ibu dan adik-adikmu datang dari kampung menonton pertandingan berikutnya. Mereka membawa rendang buatan sendiri.',
    choices: [
      { label: 'Habiskan akhir pekan bersama mereka', outcomes: [{ text: 'Kamu pulih secara mental dan tersenyum tulus.', fx: { morale: 10, fitness: 3, rel: { team: 1 } } }] },
      { label: 'Ajak mereka jalan-jalan keliling kota', outcomes: [{ text: 'Menyenangkan, tapi kaki jadi pegal.', fx: { morale: 8, fitness: -6 } }] },
      { label: 'Fokus pertandingan, temui mereka sesudahnya', outcomes: [{ text: 'Kamu bermain dengan rasa ingin membuktikan sesuatu.', fx: { form: 5, morale: 3 } }] },
    ],
  },
  {
    id: 'pasangan', title: 'Pasanganmu ingin lebih sering bertemu', weight: 4, cooldown: 50, cond: (c) => c.h.age >= 18,
    text: 'Pasanganmu mengeluh karena jadwal latihan dan pertandingan membuatmu jarang ada waktu.',
    choices: [
      { label: 'Luangkan malam bersama', outcomes: [{ text: 'Malam yang hangat. Hubungan kalian makin baik.', fx: { morale: 8, fitness: 2 } }] },
      { label: 'Jelaskan karier sedang penting-pentingnya', outcomes: [{ p: 0.5, text: 'Ia memahami, meski masih agak kecewa.', fx: { morale: 0, attr: { mental: 0.4 } } }, { p: 0.5, text: 'Percakapannya berakhir dengan pertengkaran.', fx: { morale: -8, form: -3 } }] },
    ],
  },
  {
    id: 'amal', title: 'Kegiatan amal', weight: 4, cooldown: 40, cond: (c) => c.h.fame >= 14,
    text: 'Klub mengundangmu menghadiri kegiatan amal di panti asuhan. Anak-anak ingin bertemu para pemain.',
    choices: [
      { label: 'Datang dan bermain bola bersama anak-anak', outcomes: [{ text: 'Sehari yang menyenangkan. Foto-fotomu tersebar dan disukai banyak orang.', fx: { fame: 2, rel: { fans: 6, media: 3 }, morale: 5, fitness: -3 } }] },
      { label: 'Kirim donasi saja', outcomes: [{ text: 'Donasimu dihargai, meski tak semeriah kehadiran langsung.', fx: { money: -30, rel: { fans: 1 } } }] },
    ],
  },
  {
    id: 'nyanyian_fans', title: 'Namamu dinyanyikan', weight: 5, cooldown: 30, cond: (c) => c.h.rel.fans >= 65,
    text: 'Di tribun, para suporter membuat lagu baru dengan namamu. Kamu mendengarnya dari lorong pemain.',
    choices: [
      { label: 'Melambai dan berterima kasih pada mereka', outcomes: [{ text: 'Teriakan mereka menggetarkan stadion. Kamu merinding.', fx: { morale: 8, rel: { fans: 4 }, form: 3 } }] },
      { label: 'Tetap fokus, tahan emosi', outcomes: [{ text: 'Kamu berjalan ke lapangan dengan tenang.', fx: { attr: { mental: 0.4 }, morale: 3 } }] },
    ],
  },
  {
    id: 'teman_lama', title: 'Teman lama minta bantuan', weight: 3, cooldown: 60, cond: (c) => c.h.fame >= 30 && c.h.money >= 60,
    text: 'Seseorang yang dulu jarang menyapamu tiba-tiba mengirim pesan panjang dan bilang butuh pinjaman uang.',
    choices: [
      { label: 'Bantu sedikit', outcomes: [{ text: 'Kamu membantu, walau curiga tak akan dikembalikan.', fx: { money: -40, morale: 1 } }] },
      { label: 'Tolak halus', outcomes: [{ text: 'Ia mendiamkanmu di media sosial, tapi kamu merasa lega.', fx: { morale: 0 } }] },
    ],
  },
  {
    id: 'rival_hattrick', title: 'Sang rival mencetak hat-trick', weight: 6, cooldown: 24, cond: (c) => senior(c) && c.rival !== null,
    text: (c) => `${c.rival?.name}, striker ${c.g.world.clubs.find((x) => x.id === c.rival?.clubId)?.short}, mencetak hat-trick akhir pekan ini. Semua media membandingkan kalian berdua.`,
    choices: [
      { label: 'Jadikan motivasi tambahan', outcomes: [{ p: 0.6, text: 'Kamu berlatih lebih keras dari biasanya.', fx: { attr: { shooting: 0.5 }, fitness: -5, morale: 2 } }, { p: 0.4, text: 'Terlalu memikirkannya, kamu justru tertekan.', fx: { form: -4, morale: -3 } }] },
      { label: 'Kirim ucapan selamat lewat medsos', outcomes: [{ text: 'Tindakan dewasa yang dipuji netizen.', fx: { fame: 2, rel: { media: 4, fans: 2 } } }] },
      { label: 'Abaikan, fokus pada dirimu sendiri', outcomes: [{ text: 'Kamu kembali fokus ke latihan.', fx: { attr: { mental: 0.4 } } }] },
    ],
  },
  {
    id: 'kritik_media', title: 'Dikritik habis-habisan', weight: 6, cooldown: 14, cond: (c) => senior(c) && c.h.fame >= 15 && c.h.form < 38,
    text: 'Sebuah kolom olahraga menulis bahwa kamu "terlalu dibesar-besarkan" dan menyebut penampilanmu belakangan mengecewakan.',
    choices: [
      { label: 'Jawab dengan penampilan di lapangan', outcomes: [{ text: 'Kamu memendam kekesalanmu dan menyalurkannya ke latihan.', fx: { attr: { mental: 0.5 }, morale: -1, form: 4 } }] },
      { label: 'Balas lewat medsos', outcomes: [{ p: 0.4, text: 'Balasanmu dipuji netizen.', fx: { fame: 2, rel: { fans: 3 } } }, { p: 0.6, text: 'Balasanmu memicu perang komentar. Pelatih tidak senang.', fx: { rel: { media: -6, manager: -3 }, morale: -4 } }] },
      { label: 'Ngobrol dengan psikolog klub', outcomes: [{ text: 'Sesi itu menenangkan pikiran dan memperjelas fokusmu.', fx: { morale: 5, attr: { mental: 0.6 } } }] },
    ],
  },
  {
    id: 'ulang_tahun', title: 'Ulang tahun rekan setim', weight: 3, cooldown: 20,
    text: 'Salah satu rekan setim berulang tahun. Semua orang berencana makan malam bersama.',
    choices: [
      { label: 'Datang dan bawa kado', outcomes: [{ text: 'Kamu duduk bersama semuanya dan mendengar cerita-cerita lucu.', fx: { rel: { team: 6 }, morale: 4, money: -5 } }] },
      { label: 'Ucapkan selamat saja lewat grup', outcomes: [{ text: 'Cukup aman, tapi tidak meninggalkan kesan.', fx: { rel: { team: 1 } } }] },
    ],
  },
];
