// Klub fiktif. Ubah/tambah sesuka hati (jumlah harus GENAP; 18 = 34 pekan).
export interface ClubSeed {
  id: string;
  name: string;
  short: string;
  city: string;
  reputation: number;
  budget: number;
  color: string;
  blurb: string;
}

export const LEAGUE_NAME = 'Liga Nusantara';

export const CLUBS: ClubSeed[] = [
  { id: 'garuda', name: 'Garuda Kencana FC', short: 'Garuda', city: 'Jakarta', reputation: 80, budget: 60000, color: '#c8102e', blurb: 'Raksasa ibu kota. Gelar dan tekanan datang bersamaan.' },
  { id: 'macan', name: 'Macan Kumbang FC', short: 'Macan', city: 'Bandung', reputation: 77, budget: 48000, color: '#1b1b1b', blurb: 'Basis suporter fanatik, akademi terkenal.' },
  { id: 'samudra', name: 'Laskar Samudra', short: 'Samudra', city: 'Surabaya', reputation: 75, budget: 42000, color: '#1565c0', blurb: 'Klub kota pelabuhan, keras dan cepat.' },
  { id: 'banteng', name: 'Banteng Nusantara', short: 'Banteng', city: 'Solo', reputation: 71, budget: 30000, color: '#8d1c1c', blurb: 'Klub tradisional yang stabil di papan atas.' },
  { id: 'rajawali', name: 'Rajawali Sumatera', short: 'Rajawali', city: 'Medan', reputation: 69, budget: 26000, color: '#f9a825', blurb: 'Rajin memoles bakat muda dari Sumatera.' },
  { id: 'dewata', name: 'Dewata Island FC', short: 'Dewata', city: 'Denpasar', reputation: 67, budget: 24000, color: '#00897b', blurb: 'Sepak bola menyerang, banyak pemain asing.' },
  { id: 'borneo', name: 'Bintang Borneo', short: 'Borneo', city: 'Balikpapan', reputation: 65, budget: 20000, color: '#ef6c00', blurb: 'Dana lumayan, ambisi ke papan atas.' },
  { id: 'andalas', name: 'Harimau Andalas', short: 'Andalas', city: 'Padang', reputation: 63, budget: 16000, color: '#c62828', blurb: 'Klub kebanggaan Minang, fans setia.' },
  { id: 'mataram', name: 'Surya Mataram', short: 'Mataram', city: 'Yogyakarta', reputation: 61, budget: 14000, color: '#6a1b9a', blurb: 'Klub kota pelajar, gemar memberi kesempatan pemain muda.' },
  { id: 'pantai', name: 'Pantai Emas FC', short: 'Pantai Emas', city: 'Makassar', reputation: 60, budget: 13000, color: '#fbc02d', blurb: 'Semangat pantai timur, permainan agresif.' },
  { id: 'naga', name: 'Naga Merah United', short: 'Naga Merah', city: 'Pontianak', reputation: 57, budget: 10000, color: '#d84315', blurb: 'Klub menengah dengan susunan pemain seimbang.' },
  { id: 'priangan', name: 'Elang Priangan', short: 'Priangan', city: 'Tasikmalaya', reputation: 55, budget: 8000, color: '#2e7d32', blurb: 'Klub kecil yang bangga dengan pembinaan usia muda.' },
  { id: 'mahakam', name: 'Mahakam United', short: 'Mahakam', city: 'Samarinda', reputation: 54, budget: 8000, color: '#0277bd', blurb: 'Sering jadi kuda hitam di pertengahan musim.' },
  { id: 'sakti', name: 'Palembang Sakti', short: 'Sakti', city: 'Palembang', reputation: 52, budget: 6500, color: '#f57f17', blurb: 'Sejarah panjang, keuangan sering seret.' },
  { id: 'cendrawasih', name: 'Cendrawasih FC', short: 'Cendrawasih', city: 'Jayapura', reputation: 50, budget: 5500, color: '#ad1457', blurb: 'Gudang bakat Papua, perjalanan tandang paling jauh.' },
  { id: 'pesisir', name: 'PS Pesisir Utara', short: 'Pesisir', city: 'Semarang', reputation: 48, budget: 4500, color: '#37474f', blurb: 'Klub papan bawah yang selalu berjuang bertahan.' },
  { id: 'badak', name: 'Badak Barat FC', short: 'Badak', city: 'Serang', reputation: 45, budget: 3500, color: '#5d4037', blurb: 'Anggaran tipis, banyak pemain muda.' },
  { id: 'komodo', name: 'Komodo Flores FC', short: 'Komodo', city: 'Labuan Bajo', reputation: 42, budget: 3000, color: '#558b2f', blurb: 'Klub terkecil. Peluang bermain besar, tantangan lebih besar.' },
];
