// Paket momen STRIKER (dari dokumen update_v1_5).
// Struktur: STRIKER_STEPS = semua situasi (langkah), STRIKER_ENTRIES = daftar momen yang bisa
// muncul di pertandingan. Semua langkah bisa dipakai bersama lewat next: go('id_langkah').
//
// Cara menambah momen baru: (1) tambah satu langkah di STRIKER_STEPS, (2) tambah satu baris
// di STRIKER_ENTRIES kalau situasinya ingin bisa muncul langsung. Jalankan: npm run check-moments
import type { AttrKey } from '../engine/types';
import type { MChoice, MStep, MTemplate, Next } from './moments';

// ---------- helper penulisan ringkas ----------
const go = (step: string): Next => ({ step });
const sh = (mod: number, kind?: 'foot' | 'header' | 'acrobatic'): Next => (kind ? { shot: mod, kind } : { shot: mod });
const ast = (p: number): Next => ({ assist: p });
const en = (e: 'lost' | 'neutral' | 'goal' | 'miss' | 'win' | 'control'): Next => ({ end: e });
const fl = (f: 'soft' | 'hard'): Next => ({ foul: f });
/** pilihan dengan cek stat */
const c = (label: string, stat: AttrKey, diff: number, ok: string, fail: string, next: Next, failNext?: Next): MChoice =>
  failNext ? { label, stat, diff, ok, fail, next, failNext } : { label, stat, diff, ok, fail, next };
/** pilihan tanpa cek stat (langsung berhasil) */
const d = (label: string, ok: string, next: Next): MChoice => ({ label, ok, next });
const S = (text: string, ...choices: MChoice[]): MStep => ({ text, choices });

export const STRIKER_STEPS: Record<string, MStep> = {
  // ===== 1. MENERIMA BOLA =====
  receive_box: S(
    'Bola mendarat di kakimu di dalam kotak penalti. {def} baru berbalik dari belakang.',
    c('Kontrol lalu tembak', 'dribbling', 54, 'Satu sentuhan halus, kamu siap menembak.', 'Sentuhanmu terlalu besar, bola menjauh.', go('close_range')),
    c('Putar badan melewati {def}', 'dribbling', 58, 'Kamu berputar tajam dan {def} tertinggal.', '{def} menempel dan menutup putaranmu.', go('tightAngle')),
    c('Umpan ke {mate}', 'passing', 52, 'Umpan pendek yang rapi.', 'Umpanmu tersangkut di kaki bek.', ast(0.4)),
  ),
  receive_edge_box: S(
    'Bola sampai di kakimu tepat di depan kotak penalti. Ada ruang sedikit untuk menembak.',
    c('Tembak dari luar kotak', 'shooting', 62, 'Kamu melepas sepakan tanpa ragu!', 'Kamu terburu-buru, posisi kakimu kurang pas.', sh(4)),
    c('Dribel masuk kotak', 'dribbling', 58, 'Kamu menusuk masuk melewati satu pemain.', 'Bola tersapu bek sebelum kamu masuk.', go('inside_box')),
    c('Lay-off ke {mate}', 'passing', 52, 'Umpan satu sentuhan ke {mate} yang berlari.', 'Umpanmu kurang akurat.', ast(0.32)),
  ),
  back_to_goal: S(
    'Kamu menerima bola membelakangi gawang. {def} menempel di punggungmu.',
    c('Lindungi bola (shield)', 'physical', 54, 'Kamu kokoh seperti tembok.', '{def} berhasil mencungkil bola.', go('control')),
    c('Putar badan', 'dribbling', 60, 'Putaran cepat, kamu menghadap gawang!', 'Putaranmu terbaca dan bola direbut.', go('control')),
    c('Lay-off ke {mate}', 'passing', 52, 'Satu sentuhan ke {mate} yang naik.', 'Umpan baliknya kurang tepat.', ast(0.32)),
  ),
  receive_between: S(
    'Kamu turun sedikit dan menerima bola di celah antara lini tengah dan belakang lawan.',
    c('Putar badan menghadap gawang', 'mental', 56, 'Kamu membaca ruang dengan tenang dan berputar.', 'Kamu terlambat menyadari tekanan dari belakang.', go('lastDefender')),
    c('Umpan ke {mate}', 'passing', 52, 'Umpan terobosan pendek yang cerdas.', 'Umpanmu dipotong.', ast(0.34)),
    c('Bawa bola maju', 'dribbling', 58, 'Kamu menggiring bola melewati garis tengah pertahanan.', 'Bola tersapu saat kamu mulai berlari.', go('control')),
  ),
  under_pressure: S(
    'Dua bek langsung merapat begitu bola sampai di kakimu.',
    c('Kontrol cepat', 'dribbling', 58, 'Satu sentuhan, kamu keluar dari kepungan.', 'Bola terlepas dari kakimu.', go('control')),
    c('Lindungi dengan badan', 'physical', 56, 'Kamu menahan mereka berdua!', 'Salah satu bek berhasil menjulurkan kaki.', en('control')),
    c('Oper cepat ke {mate}', 'passing', 54, 'Kamu melepas bola sebelum mereka menutup.', 'Umpanmu sedikit terlambat.', ast(0.3)),
  ),
  bad_control: S(
    'Bola datang dengan pantulan aneh dan sulit dikontrol.',
    c('Kejar bola dan amankan', 'pace', 54, 'Kamu berhasil menjangkaunya lebih dulu.', 'Bola lepas dan {def} menyapunya.', go('control')),
    c('Lindungi dan tunggu bola berhenti', 'physical', 54, 'Kamu menutup jalur {def} dengan badan.', '{def} menyodok bola dari sampingmu.', en('control')),
    c('Langsung tendang sekenanya', 'shooting', 64, 'Tendangan spontan yang mengejutkan!', 'Kaki kananmu kurang siap, bola melambung.', sh(4)),
  ),
  aerial_control: S(
    'Bola tinggi turun perlahan ke arahmu. {def} ikut melompat.',
    c('Kontrol dengan dada', 'physical', 54, 'Bola jinak di dadamu.', '{def} lebih dulu menyundulnya.', go('control')),
    c('Sundul langsung ke gawang', 'physical', 56, 'Kamu menanduk bola dengan tenaga penuh!', 'Sundulanmu kurang terarah.', sh(3, 'header')),
    c('Biarkan memantul', 'mental', 50, 'Kamu sabar menunggu bola jatuh.', '{def} maju dan menyerobot.', go('control')),
  ),
  deflection_receive: S(
    'Bola berubah arah setelah menyentuh kaki bek dan meluncur ke jalurmu.',
    c('Bereaksi cepat', 'pace', 54, 'Kamu lebih cepat dari semua orang!', 'Bola berpindah terlalu cepat untukmu.', go('inside_box')),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu meredam bola yang memantul aneh.', 'Bola menyentuh tulang keringmu.', go('control')),
    c('Tembak first-time', 'shooting', 62, 'Refleks yang tajam!', 'Tembakan spontan itu melenceng.', sh(2)),
  ),
  pass_into_feet: S(
    'Rekan setim mengirim bola tepat ke kakimu, dengan {def} berdiri dekat.',
    c('Putar badan', 'dribbling', 58, 'Kamu berputar dan menghadap gawang.', '{def} membaca gerakanmu.', go('control')),
    c('Lay-off ke {mate}', 'passing', 52, 'Satu sentuhan yang rapi.', 'Umpanmu terlalu kuat.', ast(0.32)),
    c('Lindungi bola', 'physical', 54, 'Bola aman di bawah perlindunganmu.', 'Bola direbut dari kakimu.', en('control')),
  ),
  receive_cutback: S(
    'Cutback mendatar datang ke tengah kotak, tepat di depan titik penalti. Kamu bebas!',
    c('Tembak first-time', 'shooting', 56, 'Sepakan bersih tanpa kontrol!', 'Kamu terlalu buru-buru.', sh(-4)),
    c('Kontrol dulu', 'dribbling', 54, 'Kamu mengatur bola dengan tenang.', 'Bola memantul dari kakimu.', go('close_range')),
    c('Loloskan bola (dummy)', 'mental', 58, 'Kamu membiarkannya lewat, {mate} di belakangmu menerima.', 'Bola menggelinding keluar jalur.', ast(0.42)),
  ),

  // ===== 2. PERGERAKAN TANPA BOLA =====
  run_behind: S(
    'Bek berdiri terlalu tinggi. Ada ruang luas di belakang garis pertahanan mereka.',
    c('Lari ke belakang bek', 'pace', 58, 'Kamu melesat, umpan terobosan tiba tepat di jalurmu!', 'Kamu terlalu cepat: bendera offside terangkat.', go('keeperRush'), en('lost')),
    c('Minta bola ke kaki', 'mental', 52, 'Kamu menahan diri dan menerima bola dengan aman.', 'Umpan datang terlambat.', go('control')),
  ),
  offside_trap: S(
    'Garis pertahanan naik serentak: mereka mencoba perangkap offside.',
    c('Lari cepat tepat saat umpan dilepas', 'pace', 60, 'Timing sempurna, kamu lolos!', 'Bendera terangkat: offside.', go('lastDefender'), en('lost')),
    c('Tahan lari sampai garis pecah', 'mental', 54, 'Kamu membaca jebakan dan bek terlihat kikuk.', 'Kamu terlalu ragu, peluang lewat.', en('control')),
    c('Ambil jalur diagonal', 'mental', 58, 'Jalur diagonal itu menipu seluruh garis belakang.', 'Kamu terjebak di ujung garis offside.', go('lastDefender'), en('lost')),
  ),
  diagonal_run: S(
    'Ruang diagonal terbuka di antara bek tengah dan bek sayap.',
    c('Potong diagonal', 'pace', 56, 'Kamu memotong masuk ke ruang kosong itu.', '{def} menutup ruang lebih cepat.', go('lastDefender')),
    c('Lari lurus saja', 'pace', 54, 'Larimu lurus dan tak terbendung.', 'Larimu mudah diprediksi.', go('control')),
    d('Tahan posisi', 'Kamu menunggu momen yang lebih baik.', en('neutral')),
  ),
  near_post_run: S(
    '{mate} bersiap mengirim crossing dari sayap. Kamu memikirkan ke mana harus berlari.',
    c('Serang tiang dekat', 'pace', 56, 'Kamu memotong di depan bek!', '{def} menutup jalurmu.', go('near_post_finish')),
    c('Ambil tiang jauh', 'mental', 56, 'Kamu bergerak dari radar bek.', 'Bek mengikutimu ke sisi jauh.', go('far_post_finish')),
    c('Diam di titik penalti', 'mental', 54, 'Kamu membaca lintasan bola dengan tepat.', 'Bola terbang jauh dari posisimu.', go('inside_box')),
  ),
  far_post_run: S(
    'Crossing mengarah ke tiang jauh. Kamu berada di sisi buta bek.',
    c('Serang bola di tiang jauh', 'mental', 56, 'Kamu tiba pada saat yang tepat!', 'Kamu tiba sedikit terlambat.', go('far_post_finish')),
    c('Tunggu bola rebound', 'pace', 52, 'Kamu menempatkan diri di titik jatuh bola kedua.', 'Bola memantul ke arah berlawanan.', go('scramble_box')),
  ),
  blindside_run: S(
    'Bek fokus menatap bola dan lupa memperhatikanmu.',
    c('Bergerak di belakangnya', 'mental', 54, 'Kamu menyelinap tanpa disadari.', '{def} menoleh di saat yang salah.', go('inside_box')),
    c('Angkat tangan, minta bola', 'passing', 50, 'Rekanmu melihat dan mengirim bola.', 'Rekanmu tidak melihat isyaratmu.', go('control')),
  ),
  between_defenders: S(
    'Dua bek tengah menjagamu rapat, hampir tak ada celah di antara mereka.',
    c('Selip di antara mereka', 'mental', 58, 'Kamu menemukan celah yang hampir tak terlihat.', 'Kedua bek merapat dan menutup celah.', go('inside_box')),
    c('Tarik salah satu bek keluar', 'mental', 54, 'Satu bek terpancing, ruang terbuka untuk {mate}.', 'Kedua bek tidak bergeming.', ast(0.36)),
  ),
  pull_defender: S(
    '{mate} membawa bola maju. Kamu bisa menentukan arah pergerakan bek.',
    c('Tarik bek menjauh', 'mental', 52, 'Bek terpancing mengikutimu, ruang terbuka.', 'Bek tetap menjaga posisinya.', ast(0.38)),
    c('Masuk ke dalam kotak', 'pace', 54, 'Kamu tiba di kotak lebih cepat dari bek.', 'Bek menutup jalurmu.', go('inside_box')),
    c('Keluar dari kotak', 'mental', 50, 'Gerakanmu membuka celah besar di tengah.', 'Gerakanmu terbaca, tak ada efek.', ast(0.3)),
  ),
  dummy_run: S(
    '{mate} punya ruang untuk menerobos masuk. Kamu bisa membantu dengan pergerakanmu.',
    c('Lari tipuan ke sisi lain', 'mental', 52, 'Bek mengikutimu, {mate} bebas!', 'Tidak ada bek yang terpengaruh.', ast(0.4)),
    d('Tetap di dalam kotak', 'Kamu tetap sabar menunggu di area berbahaya.', en('neutral')),
  ),
  check_run: S(
    'Tidak ada ruang di belakang bek. Kamu perlu mengubah pola pergerakanmu.',
    c('Turun menjemput bola', 'mental', 52, 'Kamu turun dan menerima bola dengan bebas.', '{def} ikut turun dan menempelmu.', go('control')),
    d('Tetap menunggu', 'Kamu bersabar sampai ada celah.', en('neutral')),
  ),
  channel_run: S(
    'Ada celah di antara bek tengah dan bek sayap yang bisa dimasuki.',
    c('Masuk ke channel', 'pace', 58, 'Kamu melesat masuk ke celah itu!', 'Bek sayap menutup di detik terakhir.', go('lastDefender')),
    d('Tetap di tengah', 'Kamu menjaga bentuk penyerangan tim.', en('neutral')),
  ),
  curved_run: S(
    'Kamu harus menghindari offside sambil tetap mencapai bola.',
    c('Lari melengkung', 'mental', 56, 'Lari melengkungmu menjaga kamu tetap onside.', 'Lengkunganmu terlalu lebar, bola lewat.', go('keeperRush')),
    c('Lari lurus dan berisiko', 'pace', 58, 'Kamu lolos tipis dari garis offside!', 'Bendera terangkat.', go('lastDefender'), en('lost')),
  ),
  late_box_entry: S(
    '{mate} menyerang dari sayap dan kotak masih terisi bek. Kamu bisa mengatur waktu masuk.',
    c('Masuk terlambat dari belakang', 'mental', 54, 'Kamu muncul tiba-tiba di titik yang bebas!', 'Kamu terlalu lambat, bola sudah dibersihkan.', go('cutback_finish')),
    c('Langsung menyerbu masuk', 'pace', 56, 'Kamu tiba lebih awal dan menantang bola.', 'Kamu tertahan bek.', go('low_cross')),
  ),
  second_post_run: S(
    'Bola menuju tiang jauh dan kamu menyusul dari belakang.',
    c('Serang bola langsung', 'pace', 56, 'Kamu melesat menuju bola!', 'Bola melintas terlalu cepat.', go('far_post_finish')),
    c('Tunggu bola kedua', 'mental', 52, 'Kamu siap di titik jatuh bola berikutnya.', 'Bola tak jatuh ke arahmu.', go('scramble_box')),
  ),
  drag_centerback: S(
    'Bek tengah mengikuti setiap pergerakanmu ke mana pun kamu pergi.',
    c('Bawa bek pergi jauh', 'mental', 52, 'Kamu menarik {def} menjauh, ruang terbuka untuk {mate}.', '{def} tidak terpancing.', ast(0.4)),
    c('Putuskan lari mendadak', 'pace', 56, 'Perubahan tempomu membuat {def} tertinggal.', '{def} menempel erat.', go('control')),
  ),
  space_creation: S(
    'Bek terlalu fokus padamu. Rekan-rekanmu punya ruang lebih di belakang.',
    c('Buka ruang untuk {mate}', 'mental', 50, 'Kamu menarik perhatian bek, {mate} bebas!', 'Bek tidak terpengaruh.', ast(0.42)),
    c('Ambil bola sendiri', 'pace', 56, 'Kamu menyalip masuk ke ruang itu.', '{def} menutup jalurmu.', go('inside_box')),
  ),
  off_ball_duel: S(
    'Sebelum crossing dikirim, kamu dan {def} berebut posisi terbaik di kotak.',
    c('Dorong posisi', 'physical', 56, 'Kamu menang posisi, bola datang tepat di kepalamu.', '{def} menggeser badanmu ke pinggir.', go('high_cross')),
    c('Selip ke tiang dekat', 'mental', 54, 'Kamu keluar dari kawalan sesaat.', '{def} tidak melepasmu.', go('near_post_finish')),
    d('Mundur satu langkah', 'Kamu mengalah posisi untuk mencari sudut lain.', en('neutral')),
  ),

  // ===== 3. DUEL STRIKER VS BEK =====
  shoulder_duel: S(
    '{def} beradu bahu denganmu saat kalian sama-sama mengejar bola.',
    c('Adu badan', 'physical', 56, 'Kamu tidak tergoyahkan, bola tetap milikmu.', '{def} mendorongmu lepas dari bola.', go('control')),
    c('Hindari kontak', 'pace', 54, 'Kamu melesat lewat sisi luar.', '{def} menempel terus.', go('control')),
    c('Percepat langkah', 'pace', 58, 'Kamu meninggalkan {def} di belakang!', '{def} mempertahankan posisinya.', go('lastDefender')),
  ),
  centerback_duel: S(
    'Kamu berhadapan langsung dengan bek tengah, {def}, yang bertubuh besar.',
    c('Lindungi bola (shield)', 'physical', 56, 'Kamu menahan {def} dengan kokoh.', '{def} terlalu kuat untukmu.', go('control')),
    c('Putar badan', 'dribbling', 60, 'Kamu melewati {def} dengan putaran licin.', '{def} membaca putaranmu.', go('control')),
    c('Lari ke ruang di belakangnya', 'pace', 58, 'Kamu meninggalkan {def} yang lambat!', '{def} menempel erat.', go('lastDefender')),
  ),
  fullback_duel: S(
    'Kamu melebar ke sisi lapangan dan berhadapan dengan bek sayap lawan.',
    c('Dribel melewati bek', 'dribbling', 58, 'Kamu melewatinya dengan tipuan kaki.', 'Bek sayap merebut bola.', go('tightAngle')),
    c('Tipuan badan', 'mental', 56, 'Bek sayap terkecoh dan jatuh ke arah salah.', 'Bek sayap tidak terpancing.', go('control')),
    c('Potong ke dalam', 'pace', 56, 'Kamu memotong ke dalam dan membuka ruang tembak.', 'Bek sayap menutup jalur ke dalam.', sh(0)),
  ),
  aerial_duel_box: S(
    'Bola tinggi jatuh di kotak penalti. Kamu dan {def} sama-sama melompat.',
    c('Sundul ke arah gawang', 'physical', 58, 'Kamu menanduk bola dengan tenaga penuh!', '{def} menang di udara.', sh(2, 'header')),
    c('Sundul turun ke {mate}', 'passing', 52, 'Sundulan lembut ke jalur {mate}.', 'Sundulanmu tak terarah.', ast(0.36)),
    c('Menangkan posisi saja', 'physical', 54, 'Kamu menang posisi, bola jatuh di depanmu.', '{def} lebih dulu ke bola.', go('looseAerial')),
  ),
  front_post_duel: S(
    '{def} menjagamu ketat di tiang dekat. Corner dan crossing selalu lewat di sini.',
    c('Lompat lebih dulu', 'physical', 58, 'Kamu menyambar bola sebelum {def} sempat.', '{def} menang dalam adu lompat.', sh(3, 'header')),
    c('Tahan posisi, tunggu bola', 'physical', 54, 'Kamu menahan {def} sambil bola melintas.', '{def} menggeser badanmu.', go('looseAerial')),
  ),
  shirt_pull: S(
    '{def} menarik kausmu saat kamu berlari. Kamu bisa merasakan gerakannya.',
    c('Tetap berlari', 'physical', 58, 'Kamu melepas tarikan dan terus melaju!', 'Tarikan itu menghambat langkahmu.', go('lastDefender'), fl('soft')),
    c('Jatuhkan badan', 'mental', 52, 'Kamu jatuh, dan wasit meniup peluit!', 'Wasit tidak melihat pelanggaran, permainan lanjut.', fl('soft'), en('lost')),
    c('Lawan kontak', 'physical', 56, 'Kamu mengibaskan tangannya dan lolos.', '{def} terus menahanmu.', go('control'), en('lost')),
  ),
  late_tackle: S(
    '{def} meluncur menekel dari belakang, terlambat menyentuh bola!',
    c('Lompati tekelnya', 'pace', 56, 'Kamu melompat tepat waktu dan tetap menguasai bola!', 'Kakimu tersapu.', go('control'), fl('hard')),
    c('Tahan bola dengan badan', 'physical', 56, 'Kamu bertahan sambil menahan bola.', 'Benturan itu menjatuhkanmu.', en('control'), fl('hard')),
    c('Teruskan bola sebelum tekel tiba', 'mental', 58, 'Kamu melepas bola tepat waktu, {def} hanya menyapu angin.', 'Tekel itu sampai lebih dulu.', go('oneOne'), fl('hard')),
  ),
  tight_marking: S(
    '{def} menempelmu seperti bayangan dan tidak memberimu ruang sedikit pun.',
    c('Putar mendadak', 'dribbling', 60, 'Perubahan arahmu membuat {def} tertinggal.', '{def} tetap menempel erat.', go('control')),
    c('Tarik bek, bebaskan {mate}', 'mental', 54, '{def} terpancing, {mate} punya ruang!', '{def} tidak bergerak dari posisinya.', ast(0.35)),
    c('Lindungi bola dengan badan', 'physical', 54, 'Bola aman di bawah perlindunganmu.', '{def} merebut bola dari kakimu.', en('control')),
  ),
  two_defenders: S(
    'Dua bek mengapitmu dari kiri dan kanan saat bola tiba.',
    c('Lay-off cepat ke {mate}', 'passing', 56, 'Satu sentuhan cerdas ke {mate}.', 'Umpanmu tersapu salah satu bek.', ast(0.34)),
    c('Putar badan melewati keduanya', 'physical', 60, 'Kamu mendorong keduanya dan lolos!', 'Mereka menjepitmu dari dua arah.', go('control')),
    c('Cari pelanggaran', 'mental', 52, 'Wasit melihat jepitan itu dan meniup peluit.', 'Wasit membiarkan permainan lanjut.', fl('soft'), en('lost')),
  ),
  defender_block: S(
    '{def} berdiri tepat di jalur tembakanmu, menutup hampir seluruh gawang.',
    c('Cari sudut tembak lain', 'dribbling', 58, 'Satu geseran kecil membuka sudut!', '{def} ikut bergeser.', sh(2)),
    c('Dribel melewatinya', 'dribbling', 60, 'Kamu melewati {def} dengan sentuhan halus.', '{def} menyapu bola.', go('control')),
    c('Umpan ke {mate}', 'passing', 52, 'Kamu mengalihkan bola ke {mate} yang terbuka.', 'Umpanmu diblok.', ast(0.36)),
  ),
  last_man_duel: S(
    'Hanya tersisa satu bek terakhir, {def}, di antara kamu dan kiper.',
    c('Adu kecepatan', 'pace', 58, 'Kamu meninggalkan {def} di belakang!', '{def} tetap sejajar denganmu.', go('oneOne')),
    c('Kelabui dengan dribel', 'dribbling', 60, 'Satu tipuan dan {def} terpeleset!', '{def} tidak tertipu.', go('oneOne')),
    c('One-two dengan {mate}', 'passing', 56, 'Kombinasi sempurna, {def} tak berdaya.', '{mate} tidak sempat mengembalikan bola.', go('oneOne')),
  ),

  // ===== 4. DI DALAM KOTAK PENALTI =====
  inside_box: S(
    'Bola ada di kakimu di dalam kotak penalti. Semua mata tertuju padamu.',
    c('Tembak', 'shooting', 58, 'Kamu tidak ragu sedikit pun!', 'Kakimu kurang seimbang saat menendang.', sh(-2)),
    c('Dribel melewati bek', 'dribbling', 60, 'Kamu melewati satu bek dan gawang terbuka.', 'Bek berhasil memotong bola.', go('oneOne')),
    c('Umpan ke {mate}', 'passing', 52, 'Umpan pendek yang matang.', 'Umpanmu diblok.', ast(0.4)),
  ),
  close_range: S(
    'Jarakmu ke gawang sangat dekat. Ini peluang yang tak boleh disia-siakan.',
    c('Tembak first-time', 'shooting', 54, 'Sepakan langsung yang bersih!', 'Kamu terlalu tegang.', sh(-8)),
    c('Kontrol dulu, baru tembak', 'dribbling', 54, 'Kamu mengatur tubuh dengan tenang.', 'Bola menjauh dari kakimu.', sh(-10)),
    c('Cungkil kiper (lob)', 'shooting', 62, 'Cungkilan halus melewati {gk}!', '{gk} tidak bergerak dan menangkapnya.', sh(-6)),
  ),
  cutback_finish: S(
    'Bola ditarik mendatar dari garis akhir, meluncur ke arahmu.',
    c('Tembak first-time', 'shooting', 58, 'Kamu menyambar tanpa berpikir panjang!', 'Bola sedikit terlalu cepat untukmu.', sh(-3)),
    c('Kontrol dulu', 'dribbling', 54, 'Bola jinak, kamu punya waktu.', 'Bola memantul dari kakimu.', go('control')),
    c('Loloskan (dummy)', 'mental', 56, 'Kamu membiarkannya lewat, {mate} datang di belakangmu.', 'Bola menggelinding keluar.', ast(0.4)),
  ),
  near_post_finish: S(
    'Bola meluncur ke tiang dekat dengan kecepatan tinggi.',
    c('Sambar dengan ujung kaki', 'pace', 56, 'Kamu tiba lebih dulu dari bek!', '{def} menyapunya lebih awal.', sh(-2)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu meredam bola yang kencang itu.', 'Bola memantul liar.', go('control')),
  ),
  far_post_finish: S(
    'Bola melintas jauh ke tiang jauh. Kamu berlari menyongsongnya.',
    c('Slide menyambar', 'pace', 60, 'Kamu meluncur dan menyentuh bola!', 'Bola lewat sejengkal dari ujung kakimu.', sh(-1)),
    c('Volley', 'shooting', 62, 'Kamu menyepak di udara!', 'Sepakanmu tak menyentuh bola dengan baik.', sh(2)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu meredam bola dengan tenang.', 'Bola menjauh dari jangkauanmu.', go('control')),
  ),
  six_yard_box: S(
    'Bola berada di area enam yard, sementara bek dan kiper berebut.',
    c('Sambar dengan kaki', 'shooting', 48, 'Ujung kakimu cukup!', 'Bola melambung dari kakimu.', sh(-14)),
    c('Sundul ke gawang', 'physical', 52, 'Sundulan pendek yang tajam!', 'Kamu terhalang kaki bek.', sh(-8, 'header')),
    c('Tahan bola', 'physical', 50, 'Kamu mengamankan bola dari kerumunan.', 'Bola direbut.', go('control')),
  ),
  scramble_box: S(
    'Bola memantul berkali-kali di kotak penalti, semua orang berebut.',
    c('Sambar bola', 'pace', 56, 'Kamu paling sigap!', 'Bola direbut kaki lain.', sh(2)),
    c('Cari posisi bebas', 'mental', 54, 'Kamu menemukan ruang di tengah kekacauan.', 'Kamu terhimpit kerumunan.', go('crowded')),
    c('Lindungi bola', 'physical', 56, 'Kamu meringkuk melindungi bola.', 'Bola tersodok dari bawah tubuhmu.', go('control')),
  ),
  blocked_shot: S(
    'Tembakan pertamamu diblok! Bola memantul masih hidup di depanmu.',
    c('Sambar rebound', 'pace', 54, 'Kamu paling cepat bereaksi!', 'Bek menyapu bola lebih dulu.', sh(-3)),
    c('Dribel melewati bek', 'dribbling', 58, 'Kamu mengecoh bek yang baru saja memblok.', 'Bek itu tak tertipu dua kali.', go('tightAngle')),
    c('Tembak lagi', 'shooting', 60, 'Kamu tak memberi kesempatan bek bernapas!', 'Kamu tergesa-gesa.', sh(2)),
  ),
  keeper_save_rebound: S(
    '{gk} menepis tembakan {mate}. Bola jatuh tak jauh dari kakimu.',
    c('Sambar rebound', 'pace', 52, 'Kamu lebih cepat dari {gk}!', 'Bek menyapu bola.', sh(-8)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu mengamankan bola di tengah kerumunan.', 'Bola memantul dari kakimu.', go('crowded')),
  ),
  deflected_shot: S(
    'Bola berubah arah setelah menyentuh kaki bek dan mengarah ke sisi kotak.',
    c('Kejar bola', 'pace', 54, 'Kamu memburu bola dengan cepat.', 'Bola keluar dari jangkauanmu.', sh(-4)),
    c('Antisipasi arah bola', 'mental', 56, 'Kamu sudah bergerak ke titik jatuhnya.', 'Kamu salah menebak arah.', go('control')),
  ),
  backheel_chance: S(
    'Bola berada tepat di belakang tubuhmu. Ada ruang tipis untuk kreativitas.',
    c('Backheel!', 'dribbling', 66, 'Tumit halus yang mengecoh semua orang!', 'Tumitmu meleset dari bola.', sh(4)),
    c('Putar badan biasa', 'mental', 56, 'Kamu memutar tubuh dan menguasai bola.', '{def} memotong lebih dulu.', go('control')),
  ),
  first_time_cross: S(
    'Crossing keras meluncur di depan gawang, tanpa waktu untuk berpikir.',
    c('Tembak first-time', 'shooting', 62, 'Kamu menyambut bola tanpa ragu!', 'Bola terlalu cepat untuk ditembak.', sh(2)),
    c('Kontrol dulu', 'dribbling', 58, 'Bola jinak di kakimu.', 'Bola memantul terlalu jauh.', go('control')),
  ),
  low_cross: S(
    'Bola rendah melewati barisan bek menuju kakimu.',
    c('Sambar dengan kaki', 'shooting', 56, 'Kamu menyapu bola ke arah gawang!', 'Bola melewati ujung sepatumu.', sh(-3)),
    c('Slide menyongsong bola', 'pace', 58, 'Kamu meluncur dan menyentuh bola!', 'Kamu terlambat sedetik.', sh(-2)),
  ),
  high_cross: S(
    'Bola melambung tinggi dari sayap ke area kotak penalti.',
    c('Sundul', 'physical', 56, 'Kamu melompat tertinggi!', '{def} lebih tinggi darimu.', sh(2, 'header')),
    c('Volley dari udara', 'shooting', 62, 'Kamu menyambar bola yang turun!', 'Bola turun terlalu cepat.', sh(3)),
  ),

  // ===== 5. FINISHING KHUSUS =====
  first_time_finish: S(
    'Bola datang persis di jalur tendanganmu. Tidak perlu kontrol, tinggal sepak.',
    c('Tembak first-time', 'shooting', 58, 'Sentuhan satu kali, keras dan bersih.', 'Timing-mu sedikit telat.', sh(-4)),
    c('Kontrol dulu', 'dribbling', 54, 'Bola jinak, kamu punya waktu.', 'Bola terpental dari kakimu.', go('control')),
  ),
  volley_chance: S(
    'Bola memantul setinggi pinggang tepat di depanmu.',
    c('Volley langsung', 'shooting', 62, 'Sepakan voli yang keras!', 'Sepatumu hanya mengenai ujung bola.', sh(-2)),
    c('Redam dulu', 'physical', 54, 'Bola diredam sempurna.', 'Bola memantul liar.', go('control')),
    d('Coba voli akrobatik', 'Kamu melompat dan memutar badan!', sh(2, 'acrobatic')),
  ),
  half_volley: S(
    'Bola memantul sekali dan naik ke arah kakimu.',
    c('Half-volley', 'shooting', 60, 'Kamu menyambar tepat setelah bola memantul!', 'Kamu terlalu cepat atau terlalu lambat.', sh(-3)),
    d('Tunggu bola turun', 'Kamu sabar, tapi bek mulai merapat.', go('control')),
  ),
  chip_keeper: S(
    '{gk} maju beberapa langkah dari garis gawang.',
    c('Cungkil (chip)', 'shooting', 64, 'Cungkilan lembut melewati {gk}!', '{gk} sempat mundur dan menangkapnya.', sh(-8)),
    c('Tembak keras', 'shooting', 56, 'Kamu menembak melewati {gk} yang maju!', '{gk} menutup sudut dengan badan.', sh(-2)),
  ),
  keeper_close: S(
    '{gk} menutup jarak dengan cepat, hanya tersisa sepersekian detik.',
    c('Tembak cepat', 'shooting', 60, 'Kamu menembak sebelum {gk} tiba!', '{gk} sudah terlalu dekat.', sh(-1)),
    c('Dribel melewati kiper', 'dribbling', 62, 'Kamu mengecoh {gk} yang meluncur!', '{gk} menyapu bola dari kakimu.', sh(-10)),
    c('Cungkil (lob)', 'shooting', 64, 'Bola melambung lewat kepala {gk}!', 'Cungkilanmu terlalu pendek.', sh(-7)),
  ),
  keeper_one_on_one: S(
    'Satu lawan satu! Hanya kamu dan {gk} di depan gawang.',
    c('Tembak pojok jauh', 'shooting', 60, 'Bola menyusuri tanah menuju sudut!', '{gk} sudah menutup sudutnya.', sh(-5)),
    c('Tembak dekat kaki kiper', 'mental', 56, 'Kamu tenang, bola lolos di bawah {gk}!', '{gk} menutup dengan kakinya.', sh(-3)),
    c('Kelabui kiper dengan dribel', 'dribbling', 64, '{gk} terkecoh! Gawang terbuka!', '{gk} tak tertipu.', sh(-14)),
  ),
  keeper_wrong_position: S(
    '{gk} keluar dari posisinya, gawang terbuka lebar di depanmu.',
    c('Tembak jauh', 'shooting', 52, 'Kamu melihat ruang itu dan menembak!', 'Kamu terburu-buru.', sh(-10)),
    c('Cungkil', 'shooting', 60, 'Cungkilan sempurna!', 'Kamu terlalu banyak tenaga.', sh(-8)),
  ),
  empty_net: S(
    '{gk} terjatuh dan gawang hampir kosong. Tinggal menyelesaikan.',
    c('Tembak aman', 'mental', 40, 'Kamu tak mau ambil risiko: masuk!', 'Tekanan itu bikin kakimu kaku.', sh(-18), en('miss')),
    c('Sepak sekeras mungkin', 'shooting', 50, 'Kamu menghajar bola ke jaring!', 'Kamu terlalu bersemangat, bola melambung.', sh(-12), en('miss')),
  ),
  weak_foot_finish: S(
    'Bola jatuh di kaki lemahmu, sementara {def} sudah dekat.',
    c('Tembak dengan kaki lemah', 'shooting', 66, 'Kaki lemah yang mengejutkan semua orang!', 'Kaki lemahmu kurang bertenaga.', sh(2)),
    c('Pindahkan bola ke kaki kuat', 'dribbling', 56, 'Satu sentuhan cepat ke kaki kuat.', '{def} memotong bola.', sh(-2)),
  ),
  acrobatic_finish: S(
    'Bola datang terlalu tinggi untuk finishing biasa.',
    d('Coba salto', 'Kamu melayang di udara!', sh(0, 'acrobatic')),
    c('Volley biasa', 'shooting', 64, 'Kamu menyambar dengan teknik bagus!', 'Bola terlalu tinggi untukmu.', sh(2)),
    c('Biarkan turun dulu', 'mental', 50, 'Kamu sabar menunggu bola turun.', '{def} sudah menyerobot.', go('control')),
  ),
  awkward_finish: S(
    'Bola datang dengan posisi tubuhmu serba salah.',
    c('Pakai bagian kaki apa saja', 'physical', 58, 'Bagian kaki yang tak lazim, tapi mengarah!', 'Kamu kehilangan keseimbangan.', sh(3)),
    c('Slide', 'pace', 58, 'Kamu meluncur dan menyodok bola!', 'Kamu terlambat sedikit.', sh(4)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu meredam bola yang rumit itu.', 'Bola terlepas dari kontrolmu.', go('control')),
  ),
  header_finish: S(
    'Crossing tepat menuju kepalamu, tanpa gangguan berarti.',
    c('Arahkan ke pojok', 'shooting', 56, 'Sundulan yang cermat!', 'Kamu menanduk terlalu cepat.', sh(0, 'header')),
    c('Sundul keras', 'physical', 54, 'Kamu menanduk dengan seluruh tenaga!', 'Sundulanmu kurang terarah.', sh(-2, 'header')),
    c('Turunkan ke {mate}', 'passing', 52, 'Sundulan lembut ke kaki {mate}.', 'Bola terlalu jauh dari {mate}.', ast(0.35)),
  ),
  diving_header: S(
    'Bola terlalu jauh untuk sundulan biasa. Hanya diving header yang bisa mencapainya.',
    c('Diving header', 'physical', 62, 'Kamu terbang menyongsong bola!', 'Kamu jatuh dan bola lewat begitu saja.', sh(2, 'header')),
    c('Tunggu bola kedua', 'mental', 50, 'Kamu mengatur diri untuk bola berikutnya.', 'Bola tak jatuh di dekatmu.', go('looseAerial')),
  ),
  toe_poke: S(
    'Bek sudah menutup ruang, tinggal ujung kaki yang sempat menjangkau bola.',
    c('Sodok dengan ujung kaki', 'pace', 60, 'Cukup untuk mengubah arah bola!', 'Ujung kakimu tak sampai.', sh(-4)),
    c('Dribel masuk lebih dalam', 'dribbling', 60, 'Kamu mencari sudut lebih baik.', 'Bek menyapu bola.', go('tightAngle')),
  ),

  // ===== 6. SITUASI KIPER =====
  keeper_narrow: S(
    '{gk} merapat dan menutup sudut tembak dengan rapi.',
    c('Tembak jauh', 'shooting', 62, 'Kamu menemukan celah di sisi jauh!', '{gk} menutup celahnya.', sh(2)),
    c('Tembak dekat', 'shooting', 58, 'Bola meluncur di sisi dekat!', '{gk} sigap menangkap.', sh(0)),
    c('Cutback ke {mate}', 'passing', 52, 'Kamu menarik bola ke {mate} yang bebas.', 'Umpanmu tersapu bek.', ast(0.38)),
  ),
  keeper_stays: S(
    '{gk} bertahan di garis gawang dan tidak bergerak.',
    c('Tembak', 'shooting', 56, 'Kamu memilih sudut sempurna!', '{gk} membaca arah.', sh(-1)),
    c('Dribel mendekat', 'dribbling', 60, 'Kamu memaksa {gk} mengambil keputusan.', '{gk} keluar dan menutup.', sh(-8)),
  ),
  keeper_fakes: S(
    '{gk} pura-pura maju lalu mundur lagi. Apakah dia mencoba mengecohmu?',
    c('Tahan bola, jangan terpancing', 'mental', 56, 'Kamu tak tertipu, ruang tetap milikmu.', 'Kamu terlalu ragu.', go('oneOne')),
    c('Tembak duluan', 'shooting', 60, 'Kamu menembak saat {gk} kembali ke posisi.', '{gk} sudah siap.', sh(0)),
  ),
  keeper_deflection: S(
    'Tembakan {mate} ditepis {gk} tepat ke arahmu.',
    c('Sambar rebound', 'pace', 52, 'Kamu bereaksi lebih cepat dari semua orang!', 'Bek membersihkan bola.', sh(-6)),
    c('Kontrol dulu', 'dribbling', 56, 'Bola jinak di kakimu di tengah kerumunan.', 'Bola terpental jauh.', go('crowded')),
  ),
  keeper_collision: S(
    'Kamu dan {gk} berlari menuju bola yang sama.',
    c('Teruskan tanpa takut', 'physical', 58, 'Kamu menang duel, bola di depanmu!', 'Kamu terbentur {gk}.', sh(-6), fl('soft')),
    c('Hindari benturan', 'pace', 54, 'Kamu menghindar dan bola tetap hidup.', '{gk} menang perebutan.', go('control')),
    d('Lompati kiper', 'Kamu melompat dan menghindari tabrakan.', en('neutral')),
  ),
  keeper_loose_ball: S(
    '{gk} gagal mengamankan bola dan bola menggelinding bebas.',
    c('Sambar bola', 'pace', 52, 'Kamu mendahului {gk}!', '{gk} menjatuhkan diri di atas bola.', sh(-8)),
    c('Kontrol dulu', 'dribbling', 54, 'Kamu mengamankan bola dengan tenang.', 'Bola terlepas dari kakimu.', go('oneOne')),
  ),
  keeper_angle: S(
    '{gk} memotong sudut dengan sangat rapi.',
    c('Cari tiang jauh', 'shooting', 62, 'Kamu menemukan celah kecil di tiang jauh!', '{gk} menutup jalur itu juga.', sh(2)),
    c('Cungkil kiper', 'shooting', 64, 'Cungkilan halus di atas {gk}!', 'Cungkilanmu terlalu rendah.', sh(-4)),
  ),
  keeper_hand_pressure: S(
    '{gk} berdiri tenang menunggu tembakanmu, menatapmu tanpa berkedip.',
    c('Tempatkan bola (placement)', 'shooting', 58, 'Placement yang presisi!', 'Kamu terlalu berhati-hati.', sh(0)),
    c('Tunggu {gk} bergerak', 'mental', 56, 'Kamu menunggu {gk} jatuh ke satu sisi lalu menembak ke sisi lain.', '{gk} tidak terpancing.', sh(-3)),
    c('Sepakan keras', 'shooting', 60, 'Tenaga penuh menembus tangan {gk}!', 'Bola lurus ke tangan {gk}.', sh(1)),
  ),

  // ===== 7. KOMBINASI DENGAN REKAN =====
  layoff: S(
    'Kamu menerima bola membelakangi gawang, sementara {mate} berlari dari belakangmu.',
    c('Lay-off ke {mate}', 'passing', 52, 'Satu sentuhan lembut ke jalur {mate}.', 'Umpan baliknya kurang tepat.', ast(0.4)),
    c('Putar badan sendiri', 'dribbling', 58, 'Kamu berputar dan menghadap gawang.', '{def} menempel erat.', go('control')),
  ),
  assist_from_striker: S(
    'Kamu menarik dua bek, lalu melihat {mate} sendirian di sisi lain.',
    c('Kirim bola ke {mate}', 'passing', 54, 'Umpan yang cerdas!', 'Umpanmu terlalu keras.', ast(0.46)),
    c('Tembak sendiri', 'shooting', 60, 'Kamu memilih mengambil peluang itu sendiri.', 'Sudutnya terlalu sempit.', sh(2)),
  ),
  wall_pass: S(
    'Bek berdiri di depanmu. Ada {mate} di dekatmu yang bisa dipakai sebagai tembok.',
    c('One-two dengan {mate}', 'passing', 56, 'Kombinasi cepat, kamu lolos dari {def}!', 'Bola pantul dari {mate} tersapu.', go('inside_box')),
    c('Dribel sendiri', 'dribbling', 60, 'Kamu mengecoh {def}.', '{def} merebut bola.', go('control')),
  ),
  striker_drop: S(
    'Kamu turun jauh menjemput bola karena tim membutuhkan penghubung.',
    c('Terima dan amankan', 'mental', 52, 'Kamu menerima bola dan tim bisa naik.', '{def} ikut turun dan mengganggu.', go('control')),
    c('Putar dan menghadap gawang', 'dribbling', 58, 'Putaran cepat, kamu menghadap ke depan.', 'Putaranmu terlalu lambat.', go('lastDefender')),
  ),
  striker_spin: S(
    'Setelah lay-off, kamu berputar ke belakang bek yang mengikutimu.',
    c('Spin ke belakang bek', 'pace', 58, 'Kamu memutar tajam dan lepas dari kawalan!', '{def} tak melepasmu.', go('inside_box')),
    d('Tahan langkah', 'Kamu menunggu bola kembali dengan sabar.', en('neutral')),
  ),
  overlap_support: S(
    '{mate} menyusul dari belakang dengan overlap lebar.',
    c('Umpan ke {mate} yang overlap', 'passing', 54, 'Umpan yang tepat ke jalur larinya.', 'Umpanmu kurang menembus.', ast(0.38)),
    c('Tetap bawa bola', 'dribbling', 58, 'Kamu memainkan bola sendiri.', '{def} merebut bola.', go('control')),
  ),
  two_striker_combo: S(
    'Partner penyerangmu dekat, keduanya berada di dalam kotak.',
    c('One-two dengan partner', 'passing', 54, 'Kombinasi cepat yang menembus bek!', 'Pantulan partner tersapu.', go('inside_box')),
    c('Dummy untuk partner', 'mental', 54, 'Kamu melewatkan bola, partner menerima dengan bebas.', 'Bola menggelinding keluar jalur.', ast(0.38)),
  ),
  assist_vs_shot: S(
    '{mate} bebas di sampingmu, tetapi kamu juga punya jalur tembak sendiri.',
    c('Tembak sendiri', 'shooting', 58, 'Kamu percaya pada dirimu sendiri!', 'Tembakanmu diblok.', sh(0)),
    c('Kirim assist ke {mate}', 'passing', 52, 'Kamu membagi peluang dengan rekan.', 'Umpanmu tak sampai.', ast(0.44)),
  ),
  through_for_mate: S(
    'Kamu menerima bola di kotak penalti, sementara {mate} berlari bebas di sisi lain.',
    c('Tembak sendiri', 'shooting', 58, 'Kamu tak mau berbagi peluang!', 'Sudutmu terlalu sempit.', sh(-2)),
    c('Kirim bola ke {mate}', 'passing', 52, 'Umpan bagus ke jalur {mate}.', 'Umpanmu terlalu lemah.', ast(0.46)),
  ),

  // ===== 8. COUNTER ATTACK =====
  counter_two_vs_one: S(
    'Serangan balik 2 lawan 1: kamu dan {mate} melawan {def} seorang diri.',
    c('Bawa bola sendiri', 'dribbling', 56, '{def} terpancing mendekatimu dan gawang terbuka.', '{def} memotong jalurmu.', go('oneOne')),
    c('Umpan ke {mate}', 'passing', 52, 'Umpan datar sempurna, {def} tak berdaya!', 'Umpanmu dipotong.', ast(0.5)),
  ),
  counter_three_vs_two: S(
    'Tiga penyerang melawan dua bek lawan. Serangan balik yang menjanjikan.',
    c('Lewat tengah', 'mental', 54, 'Kamu memilih jalur terbaik!', 'Kedua bek menutup jalur tengah.', go('inside_box')),
    c('Lewat sayap', 'pace', 56, 'Kamu melebar dan crossing menunggu.', 'Bek mengunci sisi sayap.', go('low_cross')),
    c('Langsung tembak', 'shooting', 62, 'Kamu tak memberi waktu bek!', 'Tembakanmu terburu-buru.', sh(2)),
  ),
  counter_run: S(
    'Kamu berlari sendiri jauh di depan rekan-rekanmu.',
    c('Minta umpan terobosan', 'pace', 58, 'Umpan panjang tiba tepat di jalur larimu!', 'Umpan terlalu jauh.', go('keeperRush')),
    c('Tahan dulu', 'mental', 50, 'Kamu menunggu tim naik.', 'Tim naik terlalu lambat.', en('control')),
  ),
  counter_hold: S(
    'Serangan balik berjalan, tapi rekan-rekanmu belum ada yang dekat.',
    c('Tahan bola menunggu', 'physical', 54, 'Kamu menjaga bola sampai tim ikut naik.', '{def} merebut bola.', en('control')),
    c('Terus maju', 'pace', 58, 'Kamu maju sendirian!', '{def} menutup jalur.', go('lastDefender')),
  ),
  counter_early_shot: S(
    'Bek belum siap dan gawang terlihat dari kejauhan.',
    c('Tembak dari jauh', 'shooting', 66, 'Tembakan jarak jauh yang berani!', 'Bola melambung jauh dari gawang.', sh(6)),
    c('Lanjut berlari', 'pace', 54, 'Kamu menekan lebih dekat.', 'Kamu kehilangan momentum.', go('lastDefender')),
  ),
  counter_cutback: S(
    'Kamu berhasil masuk kotak penalti dalam serangan balik cepat.',
    c('Cutback ke {mate}', 'passing', 54, 'Umpan tarik sempurna!', 'Cutback-mu tersapu bek.', ast(0.44)),
    c('Tembak langsung', 'shooting', 58, 'Kamu tak ragu!', 'Sudutnya kurang bagus.', sh(-1)),
  ),
  counter_lone_striker: S(
    'Kamu sendirian melawan dua bek dalam serangan balik.',
    c('Lindungi bola', 'physical', 56, 'Kamu menahan mereka berdua!', 'Bola direbut.', en('control')),
    c('Dribel melewati keduanya', 'dribbling', 62, 'Kamu meliuk di antara keduanya!', 'Kedua bek menjepitmu.', go('oneOne')),
    c('Tunggu dukungan', 'mental', 50, 'Kamu bersabar sampai rekan tiba.', 'Kamu terlalu lama.', go('control')),
  ),
  counter_keeper: S(
    'Serangan balik berujung satu lawan satu dengan {gk}.',
    c('Tembak', 'shooting', 58, 'Kamu menembak sebelum {gk} bergerak!', '{gk} menutup sudutnya.', sh(-3)),
    c('Dribel kelabui kiper', 'dribbling', 62, '{gk} terkecoh dan jatuh!', '{gk} tidak tertipu.', sh(-14)),
  ),

  // ===== 9. BOLA MATI =====
  corner_near: S(
    'Corner ditendang menuju tiang dekat. Kamu berdiri di antara para bek.',
    c('Sundul ke arah gawang', 'physical', 58, 'Kamu menanduk dengan tenaga penuh!', '{def} menghalangi lompatanmu.', sh(2, 'header')),
    c('Flick-on ke tiang jauh', 'physical', 54, 'Sentuhan tipis yang mengarah ke {mate}.', 'Bola lewat ujung kepalamu.', ast(0.36)),
  ),
  corner_far: S(
    'Corner melengkung jauh menuju tiang jauh, tempatmu menunggu.',
    c('Sundul', 'physical', 58, 'Kamu menanduk dengan tenaga penuh!', 'Bola terlalu tinggi.', sh(3, 'header')),
    c('Volley', 'shooting', 64, 'Kamu menyambar bola yang turun!', 'Bola melenceng dari kakimu.', sh(4)),
  ),
  corner_rebound: S(
    'Corner ditepis keluar oleh {gk}, bola jatuh di sekitar kotak.',
    c('Sambar rebound', 'pace', 54, 'Kamu bereaksi lebih cepat!', 'Bola disapu bek.', sh(-5)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu mengamankan bola di tengah kerumunan.', 'Bola terlepas dari kakimu.', go('crowded')),
  ),
  free_kick_rebound: S(
    'Tendangan bebas rekan memantul dari mistar atau tepisan kiper.',
    c('Sambar bola pantul', 'pace', 54, 'Kamu paling sigap!', 'Bola disapu bek.', sh(-4)),
    c('Kontrol dulu', 'dribbling', 56, 'Kamu meredam bola di kerumunan.', 'Bola memantul liar.', go('crowded')),
  ),
  indirect_free_kick: S(
    'Bola mati tidak langsung di dekat kotak penalti. Rekanmu bersiap mengeksekusi.',
    c('Lari ke ruang kosong', 'pace', 54, 'Kamu menghilang dari radar bek.', 'Kamu offside atau tertutup.', go('inside_box')),
    d('Tahan posisi di kotak', 'Kamu menahan posisi dengan sabar.', en('neutral')),
  ),
  second_ball_setpiece: S(
    'Bola kedua dari set piece jatuh di area luar kotak.',
    c('Tembak langsung', 'shooting', 60, 'Kamu menyambar bola kedua!', 'Terlalu banyak orang di depanmu.', sh(2)),
    c('Umpan ke {mate}', 'passing', 52, 'Kamu melihat {mate} yang lebih bebas.', 'Umpanmu diblok.', ast(0.34)),
  ),
};

// ---------- daftar momen yang bisa muncul di pertandingan ----------
const E = (id: string, title: string, weight: number, tags: string[] = [], start: string = id): MTemplate => ({
  id,
  title,
  weight,
  tags,
  start,
  steps: {},
});

export const STRIKER_ENTRIES: MTemplate[] = [
  // 1. Menerima bola
  E('receive_box', 'Menerima bola di kotak', 1.6, ['finisher']),
  E('receive_edge_box', 'Menerima bola di depan kotak', 1.6, ['finisher']),
  E('back_to_goal', 'Membelakangi gawang', 1.6, ['target']),
  E('receive_between', 'Menerima bola di antara lini', 1.6, ['technician']),
  E('under_pressure', 'Ditekan dua bek', 1.6),
  E('bad_control', 'Bola sulit dikontrol', 1.6),
  E('aerial_control', 'Bola tinggi turun', 1.6, ['target']),
  E('deflection_receive', 'Bola berubah arah', 1.6),
  E('pass_into_feet', 'Bola ke kaki', 1.6, ['technician']),
  E('receive_cutback', 'Cutback ke tengah', 1.6, ['finisher']),
  // 2. Tanpa bola
  E('run_behind', 'Lari ke belakang bek', 1.3, ['speedster']),
  E('offside_trap', 'Perangkap offside', 1.3, ['speedster']),
  E('diagonal_run', 'Lari diagonal', 1.3, ['speedster']),
  E('near_post_run', 'Bersiap crossing', 1.3, ['finisher']),
  E('far_post_run', 'Crossing ke tiang jauh', 1.3, ['finisher']),
  E('blindside_run', 'Di sisi buta bek', 1.3),
  E('between_defenders', 'Di antara dua bek tengah', 1.3),
  E('pull_defender', 'Menarik bek', 1.3),
  E('dummy_run', 'Lari tipuan', 1.3, ['technician']),
  E('check_run', 'Turun menjemput bola', 1.3, ['technician']),
  E('channel_run', 'Masuk celah bek', 1.3, ['speedster']),
  E('curved_run', 'Lari melengkung', 1.3, ['speedster']),
  E('late_box_entry', 'Masuk kotak terlambat', 1.3, ['finisher']),
  E('second_post_run', 'Menyusul ke tiang jauh', 1.3, ['finisher']),
  E('drag_centerback', 'Menyeret bek tengah', 1.3),
  E('space_creation', 'Membuka ruang', 1.3, ['technician']),
  E('off_ball_duel', 'Berebut posisi sebelum crossing', 1.3, ['target']),
  // 3. Duel
  E('shoulder_duel', 'Adu bahu', 1.4, ['target']),
  E('centerback_duel', 'Duel dengan bek tengah', 1.4, ['target']),
  E('fullback_duel', 'Berhadapan bek sayap', 1.4, ['speedster', 'technician']),
  E('aerial_duel_box', 'Duel udara di kotak', 1.4, ['target']),
  E('front_post_duel', 'Duel di tiang dekat', 1.4, ['target']),
  E('shirt_pull', 'Kaus ditarik', 1.4),
  E('late_tackle', 'Tekel dari belakang', 1.4),
  E('tight_marking', 'Dijaga ketat', 1.4, ['technician']),
  E('two_defenders', 'Diapit dua bek', 1.4),
  E('defender_block', 'Bek menghalangi tembakan', 1.4),
  E('last_man_duel', 'Berhadapan bek terakhir', 1.4, ['speedster']),
  // 4. Kotak penalti
  E('inside_box', 'Bola di dalam kotak', 1.2),
  E('close_range', 'Jarak sangat dekat', 1.2, ['finisher']),
  E('angle_shot', 'Sudut tembak sempit', 1.2, [], 'tightAngle'),
  E('crowded_box', 'Kotak penuh pemain', 1.2, [], 'crowded'),
  E('cutback_finish', 'Bola ditarik dari garis akhir', 1.2, ['finisher']),
  E('near_post_finish', 'Bola ke tiang dekat', 1.2, ['finisher']),
  E('far_post_finish', 'Bola ke tiang jauh', 1.2),
  E('six_yard_box', 'Bola di area enam yard', 1.2, ['finisher']),
  E('scramble_box', 'Kekacauan di kotak', 1.2),
  E('blocked_shot', 'Tembakan diblok', 1.2),
  E('keeper_save_rebound', 'Bola tepisan kiper', 1.2),
  E('deflected_shot', 'Bola defleksi', 1.2),
  E('backheel_chance', 'Bola di belakang tubuh', 1.2, ['technician']),
  E('first_time_cross', 'Crossing keras', 1.2),
  E('low_cross', 'Crossing rendah', 1.2),
  E('high_cross', 'Crossing melambung', 1.2, ['target']),
  // 5. Finishing khusus
  E('first_time_finish', 'Peluang first-time', 0.8, ['finisher']),
  E('volley_chance', 'Peluang voli', 0.8),
  E('half_volley', 'Peluang half-volley', 0.8),
  E('chip_keeper', 'Kiper maju sedikit', 0.8, ['technician']),
  E('keeper_close', 'Kiper menutup cepat', 0.8),
  E('keeper_one_on_one', 'Satu lawan satu', 0.8),
  E('keeper_wrong_position', 'Kiper keluar posisi', 0.8),
  E('empty_net', 'Gawang kosong', 0.8),
  E('weak_foot_finish', 'Bola di kaki lemah', 0.8),
  E('acrobatic_finish', 'Bola terlalu tinggi', 0.8),
  E('awkward_finish', 'Posisi tubuh sulit', 0.8),
  E('header_finish', 'Crossing tepat ke kepala', 0.8, ['target']),
  E('diving_header', 'Bola terlalu jauh untuk sundulan', 0.8, ['target']),
  E('toe_poke', 'Bek menutup ruang', 0.8, ['speedster']),
  // 6. Kiper
  E('keeper_rush', 'Kiper keluar jauh', 0.8, [], 'keeperRush'),
  E('keeper_narrow', 'Kiper menutup sudut', 0.8),
  E('keeper_stays', 'Kiper tetap di garis', 0.8),
  E('keeper_fakes', 'Kiper pura-pura maju', 0.8),
  E('keeper_deflection', 'Tepisan ke arahmu', 0.8),
  E('keeper_collision', 'Berebut bola dengan kiper', 0.8),
  E('keeper_loose_ball', 'Kiper gagal amankan bola', 0.8),
  E('keeper_angle', 'Kiper memotong sudut', 0.8),
  E('keeper_hand_pressure', 'Kiper menunggu tembakan', 0.8),
  // 7. Kombinasi
  E('layoff', 'Lay-off ke rekan', 1.4, ['technician']),
  E('assist_from_striker', 'Menarik bek lalu memberi bola', 1.4, ['technician']),
  E('wall_pass', 'Bek di depanmu', 1.4, ['technician']),
  E('striker_drop', 'Turun menjemput bola', 1.4, ['technician']),
  E('striker_spin', 'Berputar ke belakang bek', 1.4, ['speedster']),
  E('overlap_support', 'Rekan overlap', 1.4),
  E('two_striker_combo', 'Kombinasi dua striker', 1.4, ['technician']),
  E('assist_vs_shot', 'Tembak atau memberi bola', 1.4),
  E('through_for_mate', 'Rekan berlari bebas', 1.4),
  // 8. Serangan balik
  E('counter_two_vs_one', 'Serangan balik 2 lawan 1', 1.3, ['speedster']),
  E('counter_three_vs_two', 'Serangan balik 3 lawan 2', 1.3, ['speedster']),
  E('counter_run', 'Berlari sendirian', 1.3, ['speedster']),
  E('counter_hold', 'Tanpa dukungan', 1.3),
  E('counter_early_shot', 'Bek belum siap', 1.3),
  E('counter_cutback', 'Masuk kotak dari counter', 1.3),
  E('counter_lone_striker', 'Sendirian lawan dua bek', 1.3),
  E('counter_keeper', 'Counter berujung satu lawan satu', 1.3),
  // 9. Bola mati
  E('corner_near', 'Corner ke tiang dekat', 0.7, ['target']),
  E('corner_far', 'Corner ke tiang jauh', 0.7, ['target']),
  E('corner_rebound', 'Corner ditepis', 0.7),
  E('free_kick_rebound', 'Free kick memantul', 0.7),
  E('indirect_free_kick', 'Bola mati tidak langsung', 0.7),
  E('second_ball_setpiece', 'Bola kedua set piece', 0.7),
];
