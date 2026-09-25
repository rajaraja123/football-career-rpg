// Penyimpanan lokal. Untuk versi mobile/produksi bisa diganti IndexedDB atau
// Capacitor Preferences tanpa mengubah kode lain: cukup pertahankan 3 fungsi ini.
import type { GameState } from '../engine/types';

const KEY = 'garis-karier-save-v1';

export function saveGame(g: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch (e) {
    console.warn('Gagal menyimpan', e);
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    return g && g.v === 1 ? g : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}
