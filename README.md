# Garis Karier — Football Career RPG

Game teks karier sepak bola (striker, dari akademi umur 16 sampai pensiun) yang jalan di browser.
Liga fiktif: **Liga Nusantara** (18 klub, 34 pekan).

## Cara menjalankan

1. Pasang **Node.js LTS** (https://nodejs.org), lalu cek di terminal: `node -v`
2. Buka folder proyek ini di VS Code: **File → Open Folder**
3. Buka terminal VS Code: **Ctrl + `** (atau menu Terminal → New Terminal)
4. Jalankan:
   ```
   npm install
   npm run dev
   ```
5. Browser terbuka di http://localhost:5173. Simpan file di VS Code, halaman otomatis ter-refresh.

Perintah lain:
- `npm run build` : build produksi ke folder `dist/`
- `npm run typecheck` : cek error TypeScript
- `npm run sim -- 100` : simulasi 100 karier otomatis untuk balancing (tanpa UI)

## Struktur

```
src/
  data/            <- KONTEN, paling sering kamu ubah
    clubs.ts       daftar klub fiktif
    events.ts      event di luar lapangan (tambah objek baru = event baru)
    moments.ts     momen kunci di pertandingan (pilihan, kesulitan, teks)
    names.ts       generator nama pemain
  engine/          <- LOGIKA game (tanpa UI)
    game.ts        alur utama: pekan -> event -> pertandingan -> akhir musim
    match.ts       simulasi pertandingan + momen kunci
    player.ts      atribut, perkembangan umur, latihan, nilai pasar
    world.ts       liga, jadwal, klub AI, regenerasi pemain
    transfer.ts    tawaran klub, kontrak
    events.ts      mesin event
  ui/render.ts     tampilan, ui/styles.css
  save/storage.ts  simpan/muat (saat ini localStorage)
scripts/simulate.ts  simulator balancing
```

## Yang gampang diubah

- **Tambah event**: salin satu objek di `src/data/events.ts`, ubah teks, `cond`, dan `outcomes`.
- **Tambah momen pertandingan**: tambah template di `src/data/moments.ts`.
- **Kesulitan gol**: konstanta `SHOT_BASE`, `STEP_BIAS`, dan peluang keterlibatan di `src/engine/match.ts`. Setelah mengubah, jalankan `npm run sim` dan lihat kolom gol per musim.
- **Kecepatan berkembang**: `growthRate()` dan `trainingGain()` di `src/engine/player.ts`.
- **Klub**: `src/data/clubs.ts` (jumlah klub harus genap).

## Rencana berikutnya

- Piala/kompetisi tambahan, liga luar negeri, pinjaman (loan)
- Lebih banyak event berantai, pasangan/keluarga, cedera jangka panjang
- Posisi lain selain striker
- Simpan ke IndexedDB, lalu bungkus jadi PWA atau aplikasi mobile dengan Capacitor
