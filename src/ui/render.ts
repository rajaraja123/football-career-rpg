import { CLUBS } from '../data/clubs';
import { act, choose, createGame, heroClub, nextFixture, seasonLabel } from '../engine/game';
import { ARCHETYPES, ATTR_KEYS, ATTR_LABEL, effRating, heroValue, overallOf, starsOfPotential } from '../engine/player';
import { offerLine } from '../engine/transfer';
import { money } from '../engine/util';
import { clubLevel, clubOf, fixturesFor, sortedTable, squadOf, startingXI } from '../engine/world';
import type { GameState, MomentChoice, Prompt } from '../engine/types';
import { clearSave, loadGame, saveGame } from '../save/storage';

let root: HTMLElement;
let g: GameState | null = null;
let screen: 'menu' | 'new' | 'game' = 'menu';
let mobileTab: 'story' | 'player' | 'league' = 'story';
let sideTab: 'tabel' | 'skor' | 'skuad' | 'jadwal' | 'karier' = 'tabel';
let renderedLog = 0;
const form = { name: 'Raja', archetype: 'finisher', clubId: 'mataram' };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function mount(el: HTMLElement) {
  root = el;
  g = loadGame();
  screen = 'menu';
  root.addEventListener('click', onClick);
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'name') form.name = t.value;
  });
  render();
}

// ---------------- aksi ----------------

function onClick(e: Event) {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
  if (!el) return;
  const a = el.dataset.a!;
  const i = Number(el.dataset.i ?? 0);
  switch (a) {
    case 'new': screen = 'new'; break;
    case 'continue': if (g) { screen = 'game'; renderedLog = g.log.length; } break;
    case 'menu': screen = 'menu'; break;
    case 'arch': form.archetype = el.dataset.v!; break;
    case 'club': form.clubId = el.dataset.v!; break;
    case 'start':
      g = createGame({ name: form.name, archetype: form.archetype, clubId: form.clubId });
      renderedLog = 0;
      screen = 'game';
      mobileTab = 'story';
      saveGame(g);
      break;
    case 'choose':
      if (!g) return;
      choose(g, i);
      saveGame(g);
      break;
    case 'act': if (g) { act(g, el.dataset.v as 'requestTransfer' | 'cancelRequest'); saveGame(g); } break;
    case 'tab': mobileTab = el.dataset.v as typeof mobileTab; break;
    case 'side': sideTab = el.dataset.v as typeof sideTab; break;
    case 'reset':
      clearSave();
      g = null;
      screen = 'new';
      break;
  }
  render();
}

// ---------------- render utama ----------------

function render() {
  document.body.dataset.tab = mobileTab;
  if (screen === 'menu') root.innerHTML = header(false) + menuView();
  else if (screen === 'new') root.innerHTML = header(false) + newView();
  else if (g) {
    root.innerHTML = header(true) + gameView(g) + nav();
    const feed = root.querySelector('.feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
    renderedLog = g.log.length;
  }
}

function header(inGame: boolean): string {
  if (!inGame || !g) return `<div class="top"><div class="brand">Garis Karier</div></div>`;
  const age = g.hero.age;
  return `<div class="top">
    <div class="brand">Garis Karier</div>
    <div class="clock"><span><small>Musim</small>${seasonLabel(g)}</span><span><small>Pekan</small>${Math.min(g.week, 34)}/34</span><span><small>Umur</small>${age}</span></div>
    <button class="ghost" data-a="menu">Menu</button>
  </div>`;
}

function nav(): string {
  const b = (v: string, l: string) => `<button class="${mobileTab === v ? 'on' : ''}" data-a="tab" data-v="${v}">${l}</button>`;
  return `<div class="nav">${b('story', 'Cerita')}${b('player', 'Pemain')}${b('league', 'Liga')}</div>`;
}

// ---------------- menu ----------------

function menuView(): string {
  const cont = g
    ? `<button class="btn primary" style="max-width:340px" data-a="continue">Lanjutkan ${esc(g.hero.name)} (umur ${g.hero.age})</button>`
    : '';
  return `<div class="menu"><div class="card">
    <h1>Garis Karier</h1>
    <p class="lead">Jalani karier striker dari akademi umur 16 sampai gantung sepatu. Tiap pekan kamu memilih latihan, menghadapi kejadian di luar lapangan, dan menentukan momen kunci di dalam pertandingan.</p>
    <div class="choices stack" style="max-width:340px">${cont}<button class="btn ${g ? '' : 'primary'}" data-a="new">${g ? 'Karier baru (menimpa save)' : 'Mulai karier baru'}</button></div>
  </div></div>`;
}

function newView(): string {
  const arch = Object.entries(ARCHETYPES)
    .map(([k, a]) => `<button class="opt ${form.archetype === k ? 'sel' : ''}" data-a="arch" data-v="${k}"><b>${a.label}</b><small>${a.desc}</small></button>`)
    .join('');
  const clubs = [...CLUBS]
    .sort((a, b) => b.reputation - a.reputation)
    .map((c) => `<button class="opt ${form.clubId === c.id ? 'sel' : ''}" data-a="club" data-v="${c.id}"><b>${c.name}</b><small>${c.city}. ${c.blurb}</small></button>`)
    .join('');
  return `<div class="menu"><div class="card">
    <h1>Karier baru</h1>
    <h2>Namamu</h2>
    <input id="name" class="field" maxlength="24" value="${esc(form.name)}" autocomplete="off" />
    <h2>Gaya bermain</h2>
    <div class="grid2">${arch}</div>
    <h2>Akademi pertama</h2>
    <p class="lead">Klub besar punya fasilitas dan sorotan lebih, tapi persaingan menuju tim utama lebih ketat.</p>
    <div class="grid2">${clubs}</div>
    <div class="choices stack" style="max-width:340px;margin-top:22px"><button class="btn primary" data-a="start">Masuk akademi</button><button class="btn" data-a="menu">Kembali</button></div>
  </div></div>`;
}

// ---------------- layar game ----------------

function gameView(g: GameState): string {
  return `<div class="main">
    <div class="pane left-pane">${playerPanel(g)}</div>
    <div class="pane center-pane center">${feed(g)}${dock(g)}</div>
    <div class="pane right-pane side">${sidePanel(g)}</div>
  </div>`;
}

function feed(g: GameState): string {
  const start = Math.max(0, g.log.length - 140);
  const items = g.log.slice(start).map((e, i) => {
    const fresh = start + i >= renderedLog ? ' fresh' : '';
    return `<div class="entry ${e.k}${fresh}"><span class="tag">${e.k === 'week' ? '' : esc(e.tag ?? '')}</span><span>${esc(e.text)}${e.k === 'week' && e.tag ? `<span class="tag">${esc(e.tag)}</span>` : ''}</span></div>`;
  });
  return `<div class="feed">${items.join('')}</div>`;
}

// ---------------- dock (prompt) ----------------

function riskChip(c: MomentChoice): string {
  if (c.p < 0) return '<span class="risk none">Langsung</span>';
  if (c.p >= 0.7) return '<span class="risk safe">Aman</span>';
  if (c.p >= 0.5) return '<span class="risk even">Seimbang</span>';
  if (c.p >= 0.3) return '<span class="risk hard">Berisiko</span>';
  return '<span class="risk long">Nekat</span>';
}

function dock(g: GameState): string {
  const p: Prompt = g.prompt;
  const h = g.hero;
  switch (p.kind) {
    case 'training': {
      const btns = ATTR_KEYS.map(
        (k, i) => `<button class="btn" data-a="choose" data-i="${i}">${ATTR_LABEL[k]}<small>Sekarang ${Math.round(h.attrs[k])}</small></button>`,
      ).join('');
      const nf = nextFixture(g);
      const tools = h.status === 'senior'
        ? h.transferRequested
          ? `<button data-a="act" data-v="cancelRequest">Tarik permintaan pindah</button>`
          : `<button data-a="act" data-v="requestTransfer">Minta pindah klub</button>`
        : '';
      const paid = h.money >= 25
        ? `<button class="btn" data-a="choose" data-i="7">Fasilitas pemulihan premium<small>€25K · pulih lebih banyak + moral naik</small></button>`
        : '';
      return `<div class="dock"><h4>Fokus latihan pekan ini</h4>
        <p>${nf ? `Laga berikutnya: ${nf.home ? 'melawan' : 'tandang ke'} ${esc(nf.opp.name)}.` : ''} Kebugaran ${Math.round(h.fitness)}%. Tabungan ${esc('')}${money(h.money)}.</p>
        <div class="choices">${btns}<button class="btn" data-a="choose" data-i="6">Istirahat<small>Gratis, pulihkan kebugaran</small></button>${paid}</div>
        <div class="tools">${tools}</div></div>`;
    }
    case 'rehab':
      return `<div class="dock"><h4>Masa pemulihan cedera</h4><p>${h.injuryWeeks} pekan lagi. Bagaimana kamu menjalaninya?</p>
        <div class="choices"><button class="btn" data-a="choose" data-i="0">Rehabilitasi ketat<small>Lebih cepat pulih, ada risiko kambuh</small></button>
        <button class="btn" data-a="choose" data-i="1">Program standar<small>Aman dan stabil</small></button></div></div>`;
    case 'event':
      return `<div class="dock"><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p>
        <div class="choices stack">${p.choices.map((c, i) => `<button class="btn" data-a="choose" data-i="${i}">${esc(c)}</button>`).join('')}</div></div>`;
    case 'moment':
      return `<div class="dock"><div class="moment"><div class="hd"><span class="min">${p.minute}'</span><h4>${esc(p.title)}</h4></div>
        <p>${esc(p.text)}</p>
        <div class="choices">${p.choices.map((c, i) => `<button class="btn" data-a="choose" data-i="${i}">${riskChip(c)}${esc(c.label)}</button>`).join('')}</div></div></div>`;
    case 'info':
      return `<div class="dock"><h4>${esc(p.title)}</h4><ul class="lines">${p.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <div class="choices"><button class="btn primary" data-a="choose" data-i="0">${esc(p.button)}</button></div></div>`;
    case 'offers': {
      const list = p.offers.map((o, i) => `<button class="btn" data-a="choose" data-i="${i}">${esc(clubOf(g.world, o.clubId).name)}<small>${esc(offerLine(g, o).split(' · ').slice(1).join(' · '))}</small></button>`).join('');
      const stay = p.canStay ? `<button class="btn" data-a="choose" data-i="${p.offers.length}">${esc(p.stayLabel)}</button>` : '';
      return `<div class="dock"><h4>${esc(p.title)}</h4><p>${esc(p.text)}</p><div class="choices stack">${list}${stay}</div></div>`;
    }
    case 'retire':
      return `<div class="dock"><h4>Waktunya memutuskan</h4><p>${esc(p.text)}</p><div class="choices">
        ${p.canContinue ? `<button class="btn" data-a="choose" data-i="0">Main satu musim lagi</button>` : ''}
        <button class="btn primary" data-a="choose" data-i="1">Gantung sepatu</button></div></div>`;
    case 'end':
      return `<div class="dock"><h4>${esc(p.title)}</h4><ul class="lines">${p.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <div class="choices"><button class="btn primary" data-a="reset">Mulai karier baru</button></div></div>`;
  }
}

// ---------------- panel pemain ----------------

const bar = (v: number, cls = '') => `<div class="bar"><i class="${cls}" style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;

function playerPanel(g: GameState): string {
  const h = g.hero;
  const club = heroClub(g);
  const ovr = overallOf(h.attrs);
  const stars = starsOfPotential(h.potential);
  const roleTxt = h.status === 'academy' ? 'Akademi U-18' : h.role === 'starter' ? 'Pemain inti' : h.role === 'rotation' ? 'Rotasi' : 'Prospek';
  const attrs = ATTR_KEYS.map((k) => `<div class="row"><span>${ATTR_LABEL[k]}</span>${bar(h.attrs[k])}<b>${Math.round(h.attrs[k])}</b></div>`).join('');
  const st = (l: string, v: number, cls: string) => `<div class="row"><span>${l}</span>${bar(v, cls)}<b>${Math.round(v)}</b></div>`;
  const rel = (l: string, v: number) => st(l, v, 'blue');
  const pills = [
    `<span class="pill">${roleTxt}</span>`,
    h.injuryWeeks > 0 ? `<span class="pill warn">Cedera ${h.injuryWeeks} pekan</span>` : '',
    h.transferRequested ? `<span class="pill amber">Minta pindah</span>` : '',
  ].join('');
  return `<div class="board">
    <h2>${esc(h.name)}</h2>
    <div class="club-line"><span class="swatch" style="background:${club.color}"></span>${esc(club.name)}</div>
    <div class="ovr"><div class="ovr-num">${ovr}</div><div class="ovr-side">Overall<div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(5 - stars)}</span></div>Potensi</div></div>
    ${pills}
    <div class="sect"><h3>Atribut</h3>${attrs}</div>
    <div class="sect"><h3>Kondisi</h3>${st('Kebugaran', h.fitness, h.fitness < 40 ? 'red' : 'green')}${st('Form', h.form, 'green')}${st('Moral', h.morale, h.morale < 30 ? 'red' : 'green')}</div>
    <div class="sect"><h3>Hubungan</h3>${rel('Pelatih', h.rel.manager)}${rel('Tim', h.rel.team)}${rel('Suporter', h.rel.fans)}${rel('Media', h.rel.media)}${rel('Agen', h.rel.agent)}</div>
    <div class="sect"><h3>Keuangan dan kontrak</h3>
      <div class="kv"><span>Tabungan</span><b>${money(h.money)}</b></div>
      <div class="kv"><span>Gaji</span><b>${money(h.contract.salary)}/bln</b></div>
      <div class="kv"><span>Sisa kontrak</span><b>${Math.max(0, h.contract.yearsLeft)} th</b></div>
      <div class="kv"><span>Nilai pasar</span><b>${money(heroValue(h))}</b></div>
      <div class="kv"><span>Popularitas</span><b>${Math.round(h.fame)}</b></div>
      <div class="kv"><span>Timnas</span><b>${h.caps} caps</b></div>
    </div></div>`;
}

// ---------------- panel liga & karier ----------------

function sidePanel(g: GameState): string {
  const t = (v: typeof sideTab, l: string) => `<button class="${sideTab === v ? 'on' : ''}" data-a="side" data-v="${v}">${l}</button>`;
  let body = '';
  if (sideTab === 'tabel') body = tablePanel(g);
  else if (sideTab === 'skor') body = scorersPanel(g);
  else if (sideTab === 'skuad') body = squadPanel(g);
  else if (sideTab === 'jadwal') body = fixturePanel(g);
  else body = careerPanel(g);
  return `<div class="tabs">${t('tabel', 'Tabel')}${t('skor', 'Top skor')}${t('skuad', 'Skuad')}${t('jadwal', 'Jadwal')}${t('karier', 'Karier')}</div><div class="board">${body}</div>`;
}

function fixturePanel(g: GameState): string {
  const fx = fixturesFor(g, g.hero.clubId);
  const label = g.hero.status === 'academy' ? 'Liga U-18' : g.world.leagueName;
  const rows = fx
    .map((f) => {
      const clsAttr = f.week === g.week ? ' class="me"' : '';
      const lbl = f.home ? `vs ${f.opp.short}` : `@ ${f.opp.short}`;
      return `<tr${clsAttr} ${f.week < g.week ? 'style="opacity:.55"' : ''}><td>${f.week}</td><td>${esc(lbl)}</td></tr>`;
    })
    .join('');
  return `<div class="sect" style="margin:0;padding:0;border:0"><h3>Jadwal ${label} · ${seasonLabel(g)}</h3>
    <table><tr><th>Pekan</th><th>Lawan</th></tr>${rows}</table>
    <div class="note">Baris kuning = pekan sekarang. Baris pudar = sudah dimainkan.</div></div>`;
}

function squadPanel(g: GameState): string {
  const club = clubOf(g.world, g.hero.clubId);
  const xi = startingXI(g, club.id, { name: g.hero.name, overall: overallOf(g.hero.attrs) });
  const group = (label: string, list: { name: string; overall: number }[], heroPos?: boolean) =>
    `<div class="sect" style="margin-top:10px;padding-top:8px"><h3>${label}</h3>${list
      .map((p) => `<div class="kv"><span>${esc(p.name)}${heroPos && p.name === g.hero.name ? ' (kamu)' : ''}</span><b>${p.overall}</b></div>`)
      .join('')}</div>`;
  const bench = squadOf(g.world, club.id)
    .filter((p) => ![...xi.gk, ...xi.df, ...xi.mf, ...xi.fw].some((x) => x.name === p.name))
    .sort((a, b) => b.overall - a.overall);
  return `<div class="sect" style="margin:0;padding:0;border:0"><h3>Susunan utama ${esc(club.short)} (${xi.formation})</h3></div>
    ${group('Kiper', xi.gk)}${group('Belakang', xi.df)}${group('Tengah', xi.mf)}${group('Depan', xi.fw, true)}
    <div class="sect"><h3>Bangku cadangan</h3>${bench.slice(0, 8).map((p) => `<div class="kv"><span>${esc(p.name)} <span style="color:#9fb0cf">(${p.pos})</span></span><b>${p.overall}</b></div>`).join('')}</div>
    <div class="note">Angka di kanan = overall pemain. Susunan dihitung ulang tiap kali dibuka berdasar kondisi skuad saat ini.</div>`;
}

function tablePanel(g: GameState): string {
  const rows = sortedTable(g.world)
    .map((r, i) => {
      const c = clubOf(g.world, r.clubId);
      return `<tr class="${r.clubId === g.hero.clubId ? 'me' : ''}"><td>${i + 1}</td><td>${esc(c.short)}</td><td>${r.s.pld}</td><td>${r.s.gf - r.s.ga}</td><td>${r.s.pts}</td></tr>`;
    })
    .join('');
  const label = g.hero.status === 'academy' ? 'Liga U-18' : g.world.leagueName;
  return `<div class="sect" style="margin:0;padding:0;border:0"><h3>${label}</h3><table><tr><th>#</th><th>Klub</th><th>M</th><th>SG</th><th>Poin</th></tr>${rows}</table></div>`;
}

function scorersPanel(g: GameState): string {
  if (g.hero.status === 'academy') return `<div class="note">Tabel top skor tersedia setelah kamu masuk liga profesional.</div><div class="kv" style="margin-top:12px"><span>Golmu musim ini</span><b>${g.hero.season.goals}</b></div>`;
  const rows = g.world.players.filter((p) => p.goals > 0).map((p) => ({ n: p.name, c: clubOf(g.world, p.clubId).short, g: p.goals, me: false, rival: p.id === g.world.rivalId }));
  rows.push({ n: g.hero.name, c: heroClub(g).short, g: g.hero.season.goals, me: true, rival: false });
  rows.sort((a, b) => b.g - a.g);
  const top = rows.slice(0, 10).map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.n)}${r.rival ? ' (rival)' : ''}<br><span style="color:#9fb0cf;font-size:13px">${esc(r.c)}</span></td><td>${r.g}</td></tr>`).join('');
  const myPos = rows.findIndex((r) => r.me) + 1;
  return `<div class="sect" style="margin:0;padding:0;border:0"><h3>Top skor musim ini</h3><table><tr><th>#</th><th>Pemain</th><th>Gol</th></tr>${top}</table><div class="note">Kamu di peringkat ${myPos}.</div></div>`;
}

function careerPanel(g: GameState): string {
  const h = g.hero;
  const c = h.career;
  const logRows = h.seasonsLog
    .map((r) => `<tr><td>${r.age}</td><td>${esc(r.clubName)}</td><td>${r.apps}</td><td>${r.goals}</td><td>${r.overall}</td></tr>`)
    .join('');
  const tro = h.trophies.length ? h.trophies.map((t) => `<div class="trophy">${esc(t)}</div>`).join('') : '<div class="note">Belum ada trofi.</div>';
  return `<div class="sect" style="margin:0;padding:0;border:0"><h3>Total karier</h3>
    <div class="kv"><span>Laga</span><b>${c.apps}</b></div><div class="kv"><span>Gol</span><b>${c.goals}</b></div><div class="kv"><span>Assist</span><b>${c.assists}</b></div>
    <div class="kv"><span>Overall puncak</span><b>${h.peakOverall}</b></div></div>
    <div class="sect"><h3>Riwayat musim</h3>${logRows ? `<table><tr><th>Umur</th><th>Klub</th><th>M</th><th>G</th><th>OVR</th></tr>${logRows}</table>` : '<div class="note">Belum ada musim yang selesai.</div>'}</div>
    <div class="sect"><h3>Trofi</h3>${tro}</div>
    <div class="sect"><button class="ghost" data-a="reset">Hapus save dan mulai baru</button></div>`;
}

void effRating; void clubLevel;
