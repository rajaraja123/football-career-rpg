// Validator momen pertandingan. Jalankan: npm run check-moments
// Mengecek: langkah yang dirujuk ada, id ganda, placeholder tidak dikenal, siklus, langkah yatim.
import { LATE_MOMENTS, MOMENTS, SHARED } from '../src/data/moments';
import type { MStep, Next } from '../src/data/moments';

const errors: string[] = [];
const warns: string[] = [];
const ALLOWED = new Set(['{mate}', '{def}', '{gk}', '{opp}']);
const all = [...MOMENTS, ...LATE_MOMENTS];

// id template ganda
const seen = new Set<string>();
for (const t of all) {
  if (seen.has(t.id)) errors.push(`template id ganda: ${t.id}`);
  seen.add(t.id);
  if (t.weight < 0) errors.push(`weight negatif: ${t.id}`);
}

const stepOf = (tplId: string, stepId: string): MStep | undefined => all.find((t) => t.id === tplId)?.steps[stepId] ?? SHARED[stepId];
const nextSteps = (n: Next | undefined): string[] => (n && 'step' in n ? [n.step] : []);

function checkText(where: string, text: string | undefined) {
  if (text === undefined) return;
  for (const m of text.match(/\{[a-z]+\}/g) ?? []) if (!ALLOWED.has(m)) errors.push(`${where}: placeholder tidak dikenal ${m}`);
  if (text.trim() === '') errors.push(`${where}: teks kosong`);
}

const reached = new Set<string>(); // "tpl|step"
const reachedShared = new Set<string>();

function walk(tplId: string, stepId: string, stack: string[]) {
  const key = `${tplId}|${stepId}`;
  const st = stepOf(tplId, stepId);
  if (!st) {
    errors.push(`[${tplId}] langkah "${stepId}" tidak ada (dirujuk dari: ${stack.join(' > ') || 'start'})`);
    return;
  }
  if (stack.includes(stepId)) {
    errors.push(`[${tplId}] siklus: ${[...stack, stepId].join(' > ')}`);
    return;
  }
  const isShared = !all.find((t) => t.id === tplId)?.steps[stepId];
  if (isShared) reachedShared.add(stepId);
  if (reached.has(key)) return;
  reached.add(key);
  checkText(`[${tplId}/${stepId}] text`, st.text);
  if (!st.choices.length) errors.push(`[${tplId}/${stepId}] tanpa pilihan`);
  st.choices.forEach((ch, i) => {
    const w = `[${tplId}/${stepId}#${i + 1}]`;
    checkText(`${w} label`, ch.label);
    checkText(`${w} ok`, ch.ok);
    checkText(`${w} fail`, ch.fail);
    if (ch.stat && ch.diff === undefined) errors.push(`${w} ada stat tapi tanpa diff`);
    if (!ch.stat && ch.fail) warns.push(`${w} punya fail tapi tanpa stat (tidak pernah dipakai)`);
    if (ch.stat && !ch.fail) warns.push(`${w} cek stat tanpa teks fail`);
    if (ch.next && 'shot' in ch.next && (ch.next.shot < -25 || ch.next.shot > 20)) warns.push(`${w} shot mod ekstrem (${ch.next.shot})`);
    if (ch.next && 'assist' in ch.next && (ch.next.assist <= 0 || ch.next.assist > 0.9)) errors.push(`${w} peluang assist di luar 0..0.9`);
    for (const s of [...nextSteps(ch.next), ...nextSteps(ch.failNext)]) walk(tplId, s, [...stack, stepId]);
  });
}

for (const t of all) {
  if (!stepOf(t.id, t.start)) errors.push(`[${t.id}] start "${t.start}" tidak ada`);
  else walk(t.id, t.start, []);
  for (const sid of Object.keys(t.steps)) if (!reached.has(`${t.id}|${sid}`)) warns.push(`[${t.id}] langkah "${sid}" tidak pernah tercapai`);
}
for (const sid of Object.keys(SHARED)) if (!reachedShared.has(sid)) warns.push(`langkah bersama "${sid}" tidak dirujuk template mana pun`);

const active = MOMENTS.filter((t) => t.weight > 0);
console.log(`Template: ${MOMENTS.length} (aktif ${active.length}) + ${LATE_MOMENTS.length} menit akhir | Langkah bersama: ${Object.keys(SHARED).length}`);
console.log(`Total bobot: ${active.reduce((s, t) => s + t.weight, 0).toFixed(1)}`);
if (warns.length) console.log(`\nPeringatan (${warns.length}):\n` + warns.map((w) => '  - ' + w).join('\n'));
if (errors.length) {
  console.log(`\nERROR (${errors.length}):\n` + errors.map((e) => '  x ' + e).join('\n'));
  process.exit(1);
}
console.log('\nSemua momen valid.');
