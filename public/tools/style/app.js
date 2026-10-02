/* ═══ v2.3.2934: THE STYLE LAB, WIRED UP ═══
 *
 * The page for docs/STYLE-TEST.md: each look's prompts, the owner's pictures
 * for it (A and B versions of each), a stand-in game screen to walk round in
 * (scene.js), and a scorecard.  Pictures live in IndexedDB, scores and
 * settings in localStorage -- both wrapped, so a private window still works
 * for the length of a visit.
 */
import { STYLES, SLOTS, OBJECT_TYPES, BUILDING_W, NPC_H, CRITERIA, promptFor, sourceStyle } from './candidates.js';
import { blobToCanvas, keyOut, trim, splitObjects, seamless, resize, buildPalette, hardenAndMap, copy, mk } from './process.js';
import { Scene, loadSprites, EFFECT_PALETTE } from './scene.js';

const $ = (id) => document.getElementById(id);
const LS_KEY = 'bt-style-lab-v1';
const ROUND = { ground: 1, objects: 1, building: 2, npc: 2 };
const SNAPS = [[0, 'Off (smooth)'], [0.5, "0.5 game px (the phone's own sharpness)"], [1, '1 game px'], [1.5, '1.5 game px'], [2, "2 game px (the bro's)"], [3, '3 game px'], [4, '4 game px']];
const PALETTES = [[0, 'All colours'], [16, '16'], [24, '24'], [32, '32'], [48, '48'], [64, '64']];

/* ── storage ── */
const mem = new Map();
const store = {
  db: null,
  init() {
    return new Promise((res) => {
      try {
        const rq = indexedDB.open('bt-style-lab', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('pics');
        rq.onsuccess = () => { this.db = rq.result; res(); };
        rq.onerror = () => res();
      } catch (e) { res(); }
    });
  },
  _rq(mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction('pics', mode);
      const r = fn(t.objectStore('pics'));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  async all() {
    if (!this.db) return [...mem.values()];
    return (await this._rq('readonly', (s) => s.getAll())) || [];
  },
  async put(k, v) { if (!this.db) { mem.set(k, v); return; } await this._rq('readwrite', (s) => s.put(v, k)); },
  async del(k) { if (!this.db) { mem.delete(k); return; } await this._rq('readwrite', (s) => s.delete(k)); },
};

function loadSaved() {
  const empty = { scores: {}, tune: {}, opts: {}, last: null };
  try { return Object.assign(empty, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { return empty; }
}

const S = {
  pics: new Map(),
  saved: loadSaved(),
  sprites: null,
  scene: null,
  raf: 0,
  cur: 0,
  ver: 'A',
  token: 0,
  broBlob: null,
};

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S.saved)); } catch (e) { /* storage blocked: kept for this visit */ }
}

const key = (styleId, slot, ver) => `${styleId}|${slot}|${ver}`;
function pictureFor(styleId, slot, ver) {
  return S.pics.get(key(styleId, slot, ver)) || (ver === 'B' ? S.pics.get(key(styleId, slot, 'A')) : null) || null;
}

/* ── the look's settings ── */
function tuneOf(style) {
  const base = style.things || style.render;
  const t = S.saved.tune[style.id] || {};
  return {
    snap: t.snap != null ? t.snap : base.snap,
    palette: t.palette != null ? t.palette : base.palette,
    ground: t.ground != null ? t.ground : (style.render.ground || 640),
    objects: t.objects != null ? t.objects : 1,
  };
}
function rendersOf(style) {
  const t = tuneOf(style);
  /* v2.3.2942: pixels finer than a game px (0.5, the chosen look) are drawn
     smooth -- they are about the phone's own size, and hard edges at 1.2x
     would double every fourth pixel */
  const things = { smooth: !(t.snap >= 1), snap: t.snap, palette: t.palette };
  /* a look with separate rules for what stands (the mix) keeps its ground as
     the look says; otherwise the ground follows the same grid and palette */
  const ground = style.things ? style.render : things;
  return { ground, things, t };
}

/* ── pictures -> what the scene draws ── */
const prepCache = new Map();
function centreSquare(c) {
  const n = Math.min(c.width, c.height);
  const o = mk(n, n);
  o.getContext('2d').drawImage(c, (c.width - n) / 2, (c.height - n) / 2, n, n, 0, 0, n, n);
  return o;
}
/* Decoded pictures are big (a 1254 px square is 6 MB) and a full test is
   ~30 of them, which is more than iPhone Safari lets a tab hold.  So only
   the most recently used few stay decoded; the rest decode again when asked. */
const PREP_KEEP = 10;
function prepared(rec) {
  const ck = rec.key + '@' + rec.at;
  if (prepCache.has(ck)) {
    const hit = prepCache.get(ck);
    prepCache.delete(ck);
    prepCache.set(ck, hit);
    return hit;
  }
  const job = (async () => {
    const c = await blobToCanvas(rec.blob, 1600);
    if (rec.slot === 'ground') {
      const n = Math.min(1024, c.width, c.height);
      return seamless(resize(centreSquare(c), n, n, true));
    }
    const keyed = keyOut(c).canvas;
    if (rec.slot === 'objects') return splitObjects(keyed, 4);
    return trim(keyed);
  })().catch((e) => { prepCache.delete(ck); throw e; });
  prepCache.set(ck, job);
  while (prepCache.size > PREP_KEEP) prepCache.delete(prepCache.keys().next().value);
  return job;
}

/* The sheet is asked for as tree, boulder, bush, signpost, left to right.
   If ChatGPT drew a different number, guess by shape: tallest is the tree,
   slimmest the signpost, widest the boulder. */
function typed(parts) {
  const out = { tree: [], rock: [], bush: [], sign: [] };
  if (!parts || !parts.length) return out;
  if (parts.length === OBJECT_TYPES.length) { OBJECT_TYPES.forEach((o, i) => out[o.id].push(parts[i])); return out; }
  const rest = parts.slice().sort((a, b) => b.height - a.height);
  out.tree.push(rest.shift());
  if (rest.length) { rest.sort((a, b) => b.height / b.width - a.height / a.width); out.sign.push(rest.shift()); }
  if (rest.length) { rest.sort((a, b) => b.width / b.height - a.width / a.height); out.rock.push(rest.shift()); }
  if (rest.length) out.bush.push(rest.shift());
  return out;
}

async function buildLook(style, ver) {
  const { ground: gr, things: tr, t } = rendersOf(style);
  const src = {}, missing = [];
  for (const sl of SLOTS) {
    const rec = pictureFor(sourceStyle(style, sl.id), sl.id, ver);
    if (!rec) { missing.push(sl.name); continue; }
    src[sl.id] = await prepared(rec);
  }
  const k = t.objects;
  const parts = typed(src.objects);
  const entries = { tree: [], rock: [], bush: [], sign: [] };
  for (const o of OBJECT_TYPES) {
    for (const c of parts[o.id]) { const h = o.h * k; entries[o.id].push({ c, w: c.width * (h / c.height), h }); }
  }
  let building = null, npc = null;
  if (src.building) { const c = src.building, w = BUILDING_W * k; building = { c, w, h: c.height * (w / c.width) }; }
  /* a person is a person's size, whatever the slider says about trees */
  if (src.npc) { const c = src.npc; npc = { c, w: c.width * (NPC_H / c.height), h: NPC_H }; }
  const all = [...Object.values(entries).flat()].concat(building ? [building] : [], npc ? [npc] : []);
  /* first everything onto its grid, then ONE palette from all of it, then
     every picture onto that palette -- the look's colours are shared */
  if (tr.snap > 0) for (const e of all) e.c = resize(e.c, e.w / tr.snap, e.h / tr.snap, true);
  else for (const e of all) { const d = Math.min(1, (e.w * 2.5) / e.c.width); if (d < 1) e.c = resize(e.c, e.c.width * d, e.c.height * d, true); }
  let ground = null;
  const gw = t.ground;
  if (src.ground) ground = gr.snap > 0 ? resize(src.ground, gw / gr.snap, gw / gr.snap, true) : src.ground;
  /* the art's own colours, plus the effects' reserved ones (EFFECT_PALETTE) */
  const withFx = (n, pool) => buildPalette(pool, Math.max(2, n - EFFECT_PALETTE.length)).concat(EFFECT_PALETTE);
  let pal = null;
  if (tr.snap > 0 && tr.palette) {
    const pool = all.map((e) => e.c);
    if (ground && gr.snap > 0) pool.push(ground);
    pal = withFx(tr.palette, pool);
  }
  if (tr.snap > 0) for (const e of all) hardenAndMap(e.c, pal);
  if (ground && gr.snap > 0) {
    ground = copy(ground);
    hardenAndMap(ground, gr.palette ? (pal || withFx(gr.palette, [ground])) : null);
  }
  return {
    look: { ground, groundWorld: gw, groundRender: gr, thingsRender: tr, palette: pal, things: entries, building, npc },
    missing,
  };
}

const lookCache = new Map();
function lookKey(style, ver) {
  const parts = [style.id, ver, JSON.stringify(tuneOf(style))];
  for (const sl of SLOTS) {
    const r = pictureFor(sourceStyle(style, sl.id), sl.id, ver);
    parts.push(r ? r.key + '@' + r.at : '-');
  }
  return parts.join('|');
}
function lookFor(style, ver) {
  const k = lookKey(style, ver);
  if (!lookCache.has(k)) {
    lookCache.set(k, buildLook(style, ver).catch((e) => { lookCache.delete(k); throw e; }));
    while (lookCache.size > 3) lookCache.delete(lookCache.keys().next().value);
  }
  return lookCache.get(k);
}

/* ── adding and removing pictures ── */
async function addPicture(styleId, slot, ver, file) {
  const k = key(styleId, slot, ver);
  const rec = { key: k, styleId, slot, ver, blob: file, name: file.name || 'chatgpt.png', at: Date.now() };
  /* check it BEFORE keeping it, so a sheet the lab cannot read says so now */
  const got = await prepared(rec);
  let msg = '';
  if (slot === 'objects') {
    msg = got.length === OBJECT_TYPES.length ? 'Found the 4 objects.'
      : got.length ? `Found ${got.length} objects instead of 4; the lab guessed which is which. Asking again for "wide empty gaps" usually fixes it.`
        : 'Could not find separate objects. Ask again for a plain magenta background with wide gaps.';
  } else if (slot !== 'ground' && !got) msg = 'Could not cut it out. Ask again for a plain magenta background.';
  const old = S.pics.get(k);
  if (old && old.url) URL.revokeObjectURL(old.url);
  await store.put(k, { key: k, styleId, slot, ver, blob: file, name: rec.name, at: rec.at });
  rec.url = URL.createObjectURL(file);
  S.pics.set(k, rec);
  refreshAll();
  if (msg) toast(msg, !(slot === 'objects' && got.length === OBJECT_TYPES.length));
  return { found: Array.isArray(got) ? got.length : (got ? 1 : 0) };
}

async function removePicture(styleId, slot, ver) {
  const k = key(styleId, slot, ver);
  const old = S.pics.get(k);
  if (old && old.url) URL.revokeObjectURL(old.url);
  S.pics.delete(k);
  await store.del(k);
  refreshAll();
}

/* ── the bro, for every chat ── */
async function makeBroPicture() {
  const c = mk(1024, 1024), g = c.getContext('2d');
  g.fillStyle = '#8f948c';
  g.fillRect(0, 0, 1024, 1024);
  g.imageSmoothingEnabled = false;
  const dirs = [['south', 180, false], ['east', 512, false], ['north', 844, false]];
  for (const [d, cx] of dirs) {
    const st = S.sprites.stand[d];
    const k = 3;
    g.drawImage(st.c, 0, 0, st.fw, st.c.height, Math.round(cx - (st.fw * k) / 2), Math.round(930 - st.bot * k), st.fw * k, st.c.height * k);
  }
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  S.broBlob = blob;
  const url = URL.createObjectURL(blob);
  $('bro-img').src = url;
  $('bro-img').hidden = false;
  $('bro-save').href = url;
  $('bro-save').hidden = false;
  $('bro-hint').textContent = 'On a phone: press and hold the picture, then Save to Photos. ChatGPT attaches it from there.';
  const file = new File([blob], 'bro-reference.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    $('bro-share').hidden = false;
    $('bro-share').onclick = () => navigator.share({ files: [file] }).catch(() => {});
  }
}

/* ── the page ── */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg; t.dataset.bad = bad ? '1' : ''; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, bad ? 8000 : 3500);
}

async function copyText(text, what) {
  try { await navigator.clipboard.writeText(text); toast(what + ' copied.'); }
  catch (e) { toast('Copy did not work here: open the text and copy it by hand.', true); }
}

function countFor(style) {
  let have = 0;
  for (const sl of SLOTS) if (pictureFor(sourceStyle(style, sl.id), sl.id, 'A')) have++;
  return have;
}

function styleCard(st, idx) {
  const card = el('section', 'card');
  card.id = 'style-' + st.id;
  const h = el('h2', null, `${idx + 2}. ${st.name}`);
  const chip = el('span', 'chip');
  chip.dataset.chip = st.id;
  h.appendChild(chip);
  card.appendChild(h);
  const facts = el('p', 'facts');
  facts.innerHTML = '';
  const line = (label, text) => { const b = el('b', null, label + ' '); facts.appendChild(b); facts.appendChild(document.createTextNode(text + ' ')); facts.appendChild(el('br')); };
  line('Why try it:', st.why);
  line('The risk:', st.risks);
  line('Looks like:', st.like + '.');
  card.appendChild(facts);

  if (st.from) {
    const names = SLOTS.map((sl) => `${sl.name.toLowerCase()} from ${STYLES.find((x) => x.id === st.from[sl.id]).name}`);
    card.appendChild(el('p', 'mut', 'Needs no pictures of its own. It borrows the ' + names.join(', ') + '.'));
  } else {
    for (const sl of SLOTS) card.appendChild(slotBlock(st, sl));
  }

  const row = el('div', 'row');
  const pv = el('button', 'brass', 'Preview this look ▶');
  pv.onclick = () => openPreview(idx);
  row.appendChild(pv);
  card.appendChild(row);
  card.appendChild(tuneBlock(st));
  card.appendChild(scoreBlock(st));
  return card;
}

function slotBlock(st, sl) {
  const box = el('div', 'slot');
  const head = el('div', 'slot-head');
  const name = el('span', 'slot-name', sl.name + ' ');
  name.appendChild(el('span', 'mut', `(round ${ROUND[sl.id]})`));
  head.appendChild(name);
  const text = promptFor(st, sl.id);
  const cp = el('button', null, 'Copy prompt');
  cp.onclick = () => copyText(text, sl.name + ' prompt');
  head.appendChild(cp);
  box.appendChild(head);
  const det = el('details');
  det.appendChild(el('summary', null, 'Show the prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = text;
  ta.dataset.prompt = st.id + '|' + sl.id;
  det.appendChild(ta);
  box.appendChild(det);
  const vers = el('div', 'vers');
  for (const ver of ['A', 'B']) {
    const v = el('div', 'ver');
    v.appendChild(el('div', 'lbl', 'Version ' + ver + (ver === 'B' ? ' (round 2)' : '')));
    const img = el('img', 'thumb');
    img.alt = `${st.name} ${sl.name} ${ver}`;
    img.dataset.thumb = key(st.id, sl.id, ver);
    img.hidden = true;
    v.appendChild(img);
    const r = el('div', 'row');
    const add = el('label', 'btn', 'Add');
    add.dataset.add = key(st.id, sl.id, ver);
    const inp = el('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.dataset.file = key(st.id, sl.id, ver);
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (!f) return;
      try { await addPicture(st.id, sl.id, ver, f); } catch (e) { toast('That picture could not be read: ' + (e.message || e), true); }
    };
    add.appendChild(inp);
    r.appendChild(add);
    const rm = el('button', 'danger', 'Remove');
    rm.dataset.remove = key(st.id, sl.id, ver);
    rm.onclick = () => removePicture(st.id, sl.id, ver);
    r.appendChild(rm);
    v.appendChild(r);
    vers.appendChild(v);
  }
  box.appendChild(vers);
  return box;
}

function tuneBlock(st) {
  const det = el('details');
  det.dataset.tune = st.id;
  det.appendChild(el('summary', null, 'Fine-tune'));
  const grid = el('div', 'tune');
  const t = tuneOf(st);
  const set = (patch) => {
    S.saved.tune[st.id] = Object.assign({}, S.saved.tune[st.id], patch);
    save();
    if (!$('pv').hidden && STYLES[S.cur].id === st.id) showLook();
  };
  const sel = (label, opts, val, on) => {
    grid.appendChild(el('span', null, label));
    const s = el('select');
    for (const [v, txt] of opts) { const o = el('option', null, txt); o.value = String(v); if (v === val) o.selected = true; s.appendChild(o); }
    s.onchange = () => on(Number(s.value), s);
    grid.appendChild(s);
    return s;
  };
  const pal = { s: null };
  sel('Pixel size', SNAPS, t.snap, (v) => { set({ snap: v }); if (pal.s) pal.s.disabled = !(v > 0); });
  pal.s = sel('Colours', PALETTES, t.palette, (v) => set({ palette: v }));
  pal.s.disabled = !(t.snap > 0);
  const range = (label, min, max, step, val, fmt, on) => {
    const lab = el('span', null, label + ' ' + fmt(val));
    grid.appendChild(lab);
    const r = el('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
    r.oninput = () => { lab.textContent = label + ' ' + fmt(Number(r.value)); };
    r.onchange = () => on(Number(r.value));
    grid.appendChild(r);
  };
  range('Ground tile', 320, 1280, 32, t.ground, (v) => v + ' px', (v) => set({ ground: v }));
  range('Objects', 0.6, 1.6, 0.05, t.objects, (v) => '×' + v.toFixed(2), (v) => set({ objects: v }));
  det.appendChild(grid);
  det.appendChild(el('p', 'mut', "Pixel size is in game px per art pixel: the bro's pixels are about 2. Colours is one palette shared by the whole look."));
  return det;
}

function scoreBlock(st) {
  const det = el('details');
  det.dataset.score = st.id;
  det.appendChild(el('summary', null, 'Score it'));
  const sc = S.saved.scores[st.id] || (S.saved.scores[st.id] = { c: CRITERIA.map(() => 0), notes: '' });
  CRITERIA.forEach((txt, i) => {
    const row = el('div', 'crit');
    row.appendChild(el('span', null, txt));
    const stars = el('span', 'stars');
    for (let n = 1; n <= 5; n++) {
      const b = el('button', sc.c[i] >= n ? 'on' : null, '★');
      b.setAttribute('aria-label', `${txt}: ${n} of 5`);
      b.dataset.star = `${st.id}|${i}|${n}`;
      b.onclick = () => {
        sc.c[i] = sc.c[i] === n ? 0 : n;
        save();
        [...stars.children].forEach((x, j) => x.classList.toggle('on', sc.c[i] >= j + 1));
        renderResults();
      };
      stars.appendChild(b);
    }
    row.appendChild(stars);
    det.appendChild(row);
  });
  const notes = el('textarea');
  notes.placeholder = 'Notes: what worked, what bothered you';
  notes.style.minHeight = '70px';
  notes.value = sc.notes || '';
  notes.dataset.notes = st.id;
  notes.oninput = () => { sc.notes = notes.value; save(); renderResults(); };
  det.appendChild(notes);
  return det;
}

function refreshAll() {
  for (const img of document.querySelectorAll('img[data-thumb]')) {
    const rec = S.pics.get(img.dataset.thumb);
    img.hidden = !rec;
    if (rec) img.src = rec.url;
    const rm = document.querySelector(`button[data-remove="${CSS.escape(img.dataset.thumb)}"]`);
    if (rm) rm.hidden = !rec;
    const add = document.querySelector(`label[data-add="${CSS.escape(img.dataset.thumb)}"]`);
    if (add) add.firstChild.textContent = rec ? 'Replace' : 'Add';
  }
  for (const st of STYLES) {
    const chip = document.querySelector(`[data-chip="${st.id}"]`);
    if (!chip) continue;
    const n = countFor(st);
    chip.textContent = `${n} of ${SLOTS.length} pictures`;
    chip.classList.toggle('ok', n >= 2);
  }
  renderResults();
}

function avg(c) {
  const got = c.filter((v) => v > 0);
  return got.length ? got.reduce((a, b) => a + b, 0) / got.length : 0;
}

function renderResults() {
  const host = $('results-table');
  host.textContent = '';
  const tbl = el('table');
  const hr = el('tr');
  ['Look', 'Scores', 'Average'].forEach((x) => hr.appendChild(el('th', null, x)));
  tbl.appendChild(hr);
  const rows = STYLES.map((st) => ({ st, sc: S.saved.scores[st.id] || { c: CRITERIA.map(() => 0), notes: '' } }))
    .sort((a, b) => avg(b.sc.c) - avg(a.sc.c));
  for (const { st, sc } of rows) {
    const tr = el('tr');
    tr.appendChild(el('td', null, st.name));
    tr.appendChild(el('td', null, sc.c.map((v) => v || '–').join(' ')));
    const a = avg(sc.c);
    tr.appendChild(el('td', null, a ? a.toFixed(1) : '–'));
    tbl.appendChild(tr);
  }
  host.appendChild(tbl);
  host.appendChild(el('p', 'mut', 'Scores in order: ' + CRITERIA.map((c, i) => `${i + 1} ${c.toLowerCase()}`).join('; ') + '.'));
}

export function resultsText() {
  const lines = ['BroTown style test: results', ''];
  const rows = STYLES.map((st) => ({ st, sc: S.saved.scores[st.id] || { c: CRITERIA.map(() => 0), notes: '' } }))
    .sort((a, b) => avg(b.sc.c) - avg(a.sc.c));
  for (const { st, sc } of rows) {
    const t = tuneOf(st);
    const a = avg(sc.c);
    lines.push(`${st.name}: ${a ? a.toFixed(1) : 'not scored'}`);
    CRITERIA.forEach((c, i) => lines.push(`  ${c}: ${sc.c[i] || '-'}`));
    lines.push(`  pictures: ${countFor(st)} of ${SLOTS.length}; pixel size ${t.snap || 'off'}, colours ${t.palette || 'all'}, ground ${t.ground} px, objects x${t.objects}`);
    if (sc.notes) lines.push('  notes: ' + sc.notes.replace(/\s+/g, ' ').trim());
    lines.push('');
  }
  return lines.join('\n');
}

/* ── the preview ── */
async function ensureSprites() {
  if (!S.sprites) S.sprites = await loadSprites();
  return S.sprites;
}

function sizeCanvas() {
  const cv = $('pv-canvas');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w; cv.height = h;
    if (S.scene) S.scene._built = null;
  }
}

function applyOpts() {
  const o = Object.assign({ time: 'day', weather: 'none', dash: 'closed', shadows: true, sway: true, frame: true, auto: true }, S.saved.opts);
  S.scene.setOpts(o);
  for (const seg of document.querySelectorAll('.seg[data-opt]')) {
    const v = o[seg.dataset.opt];
    const sv = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
    for (const b of seg.children) b.classList.toggle('on', b.dataset.v === sv);
  }
}

function setOpt(name, raw) {
  const bool = ['shadows', 'sway', 'frame', 'auto'].includes(name);
  const v = bool ? raw === '1' || raw === true : raw;
  S.saved.opts[name] = v;
  save();
  if (S.scene) applyOpts();
}

async function showLook() {
  const st = STYLES[S.cur];
  $('pv-name').textContent = st.name;
  $('pv-ver').textContent = S.ver;
  $('pv-note').textContent = 'Preparing…';
  const token = ++S.token;
  try {
    const { look, missing } = await lookFor(st, S.ver);
    if (token !== S.token || !S.scene) return;
    S.scene.setLook(look);
    $('pv-note').textContent = missing.length ? `No ${missing.join(', ').toLowerCase()} picture yet. Drag to walk.` : 'Drag to walk.';
  } catch (e) {
    if (token === S.token) $('pv-note').textContent = 'This look could not be prepared: ' + (e.message || e);
  }
  S.saved.last = st.id;
  save();
}

async function openPreview(idx) {
  S.cur = idx;
  $('pv').hidden = false;
  document.body.style.overflow = 'hidden';
  $('pv-note').textContent = 'Loading the bro…';
  await ensureSprites();
  if (!S.scene) S.scene = new Scene($('pv-canvas'), S.sprites);
  sizeCanvas();
  applyOpts();
  await showLook();
  cancelAnimationFrame(S.raf);
  let last = performance.now();
  const f = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sizeCanvas();
    S.scene.frame(dt);
    S.raf = requestAnimationFrame(f);
  };
  S.raf = requestAnimationFrame(f);
}

function closePreview() {
  cancelAnimationFrame(S.raf);
  S.raf = 0;
  $('pv').hidden = true;
  $('pv-settings').hidden = true;
  document.body.style.overflow = '';
  S.token++;
  if (S.scene) S.scene.setLook(null);
}

function wirePreview() {
  $('pv-close').onclick = closePreview;
  $('pv-prev').onclick = () => { S.cur = (S.cur + STYLES.length - 1) % STYLES.length; showLook(); };
  $('pv-next').onclick = () => { S.cur = (S.cur + 1) % STYLES.length; showLook(); };
  $('pv-ver').onclick = () => { S.ver = S.ver === 'A' ? 'B' : 'A'; showLook(); };
  $('pv-set').onclick = () => { $('pv-settings').hidden = !$('pv-settings').hidden; };
  for (const seg of document.querySelectorAll('.seg[data-opt]')) {
    for (const b of seg.children) b.onclick = () => setOpt(seg.dataset.opt, b.dataset.v);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('pv').hidden) closePreview(); });
}

/* ── start ── */
async function start() {
  await store.init();
  for (const rec of await store.all()) {
    if (!rec || !rec.key || !rec.blob) continue;
    rec.url = URL.createObjectURL(rec.blob);
    S.pics.set(rec.key, rec);
  }
  const host = $('styles');
  STYLES.forEach((st, i) => host.appendChild(styleCard(st, i)));
  $('results-copy').onclick = () => copyText(resultsText(), 'Results');
  wirePreview();
  refreshAll();
  try { await ensureSprites(); await makeBroPicture(); }
  catch (e) { $('bro-hint').textContent = 'The bro could not be loaded: ' + (e.message || e); }
}

const ready = start();

/* QA probe, house style (cf. window.__world): tools/qa/style-lab.mjs */
window.__styleLab = {
  ready, S, STYLES, CRITERIA,
  addPicture, removePicture, lookFor, openPreview, closePreview, setOpt, resultsText,
  scene: () => S.scene,
  stats: () => (S.scene ? Object.assign({}, S.scene.stats, { bro: { x: S.scene.bro.x, y: S.scene.bro.y, face: S.scene.bro.face } }) : null),
};
