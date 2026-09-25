import type { RNG } from '../engine/rng';

const FIRST_ID = ['Rizky','Fajar','Bagas','Dimas','Arya','Yoga','Rafli','Ilham','Hendra','Andika','Ridwan','Bayu','Galih','Wahyu','Reza','Ferdi','Agus','Eko','Joko','Kevin','Rendy','Yusuf','Alfin','Taufik','Zaki','Nanda','Gilang','Aldo','Beni','Rio','Sandi','Tegar','Vino','Ega','Adit','Naufal','Ikbal','Marcel','Yohanes','Frans','Yance','Elias','Ricky','Osvaldo','Made','Komang','Putu','Kadek','Bagus','Daud','Ismail','Hasan','Lutfi','Anwar','Cahyo','Doni','Fikri','Hafiz','Jaya','Krisna'];
const LAST_ID = ['Pratama','Saputra','Wijaya','Hidayat','Kurniawan','Nugroho','Santoso','Firmansyah','Ramadhan','Setiawan','Permana','Siregar','Nasution','Simanjuntak','Lubis','Tampubolon','Hutagalung','Latuconsina','Wanggai','Kogoya','Mandowen','Rumakiek','Pattiasina','Tuhuteru','Sinaga','Ginting','Situmorang','Wibowo','Utomo','Hakim','Fauzi','Maulana','Aditya','Susanto','Purnomo','Suryadi','Rahman','Daeng','Mahendra','Prasetyo'];
const FIRST_FOREIGN = ['Diego','Luca','Thiago','Marko','Kenji','Yuto','Min-jun','Ibrahim','Kwame','Andre','Felipe','Igor','Samuel','Joel','Tomas','Hyun'];
const LAST_FOREIGN = ['Silva','Costa','Ferreira','Novak','Tanaka','Watanabe','Kim','Park','Mensah','Diallo','Petrov','Santos','Moreno','Ito'];

export function randomName(rng: RNG, foreign = false): string {
  if (foreign) return `${rng.pick(FIRST_FOREIGN)} ${rng.pick(LAST_FOREIGN)}`;
  return `${rng.pick(FIRST_ID)} ${rng.pick(LAST_ID)}`;
}

export function managerName(rng: RNG): string {
  return `${rng.pick(['Coach', 'Pak'])} ${rng.pick(FIRST_ID)} ${rng.pick(LAST_ID)}`;
}
