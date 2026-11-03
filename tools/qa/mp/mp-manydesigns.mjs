/* TWO FLAMES ON THE PANTS (v2.3.4157).
 *
 * Owner: "I'd like to be able to place more than one design on the character
 * during character creator I wasn't able to put two flames on the pants it
 * would erase the previous one when I tried to add another one. Also a copy
 * button (for selected design) would be great".
 *
 * WHAT WAS WRONG.  The stored look was never the limit: a canvas is one
 * 256-character string, and the editor keeps it as a list of ops (artOps.js),
 * a placed design being ONE op with its own box (v2.3.2455).  The PANEL's
 * applyDesign replaced the whole list with the new design (v2.3.2444, "It
 * REPLACES rather than merging"), so a second flame wiped the first.  It
 * appends now; a Copy button duplicates what you hold; Delete takes one off.
 *
 * WHAT THIS PROVES, in the order a player does it, on a phone in the world:
 *   0. the CONTROL: a plain bro in BroTown has (almost) no flame red on him,
 *      so the count on the inked bro below measures his trousers, not the town
 *   1. two flames from the gallery on the PANTS, each sized and moved: two
 *      design ops, the first never erased, the drawing exactly their replay
 *   2. Copy makes a second identical design, beside it, held; Undo/Redo
 *   3. Delete takes one off and Undo puts it back; recolour swaps a design's
 *      main colour (and Undo)
 *   4. the bro wears both in the world: the world's own bake input
 *      (__btArtForFacing), the worker's record, and red on his figure
 *   5. a reload (the same device coming back): still both, ops and all
 *   6. an OLD look -- the one-design op list the previous editor wrote, over a
 *      drawn base -- still loads whole and takes a second design on top
 *
 * Every drawing assertion reads localStorage (the art string, and the
 * `bt-artops` blob beside it), never the panel's markup.  The gestures are
 * real pointer events on the editor's body surface, aimed through the
 * surface's own projection (`__btInkAim`, BodyInk), the way mp-designs aims.
 */
import * as H from './harness.mjs';
import { DESIGN_CATALOG } from '../../../src/rendering/traits/designCatalog.js';
import { replay, copyOfOp, sameOp, sanitizeOp, recolorDesign } from '../../../src/rendering/traits/artOps.js';

const PHONE = { width: 390, height: 844 };
const SHOTS = '/tmp/qa-manydesigns';
const FLAME = DESIGN_CATALOG.find((d) => d.id === 'flame');
const BLANK = '0'.repeat(256);

/* The tutorial's tip cards marked done before the first script runs (as
   mp-facingside, mp-cosmpose): a card over his figure reads as no colour. */
const COACH_OFF = `try {
  const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
    'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
  const d = {}; for (const k of l) d[k] = true;
  localStorage.setItem('bt_coach_v1', JSON.stringify(d));
} catch (e) {}`;

/* Flame red (200,64,47) and orange (226,128,58): red far above both other
   channels.  The margins keep it off BroTown's gold cobbles (~230,190,90) and
   off skin (~205,134,75) -- mp-facingside's isRed, widened for the orange. */
const isFlame = (r, g, b) => r > 150 && r - g > 85 && r - b > 100;

const openCreator = async (P) => {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2400);
};

/* The Pants tab's editor, on its Draw screen (it opens on the pattern). */
const openPantsEditor = async (P) => {
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Pants');
    if (b) b.click();
  });
  await P.page.waitForTimeout(1100);
  await P.page.click('button.bt-cc-ink-pane');
  await P.page.waitForSelector('.bt-paint', { timeout: 20000 });
  await P.page.waitForTimeout(1200);
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')]
      .find((x) => /draw/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(2200);
  return P.page.evaluate(() => {
    const cv = document.querySelector('.bt-bodyink-cv');
    const aim = cv && cv.__btInkAim;
    return !!(aim && Object.keys(aim).some((k) => aim[k] && aim[k].target === 'pants'));
  });
};

const pantsArt = (P) => P.page.evaluate(() => localStorage.getItem('bt-pantsart') || '')
  .then((v) => (v.length === 256 ? v : BLANK));
const pantsOps = (P) => P.page.evaluate(() => {
  const b = JSON.parse(localStorage.getItem('bt-artops') || '{}');
  return { base: (b.pants && b.pants.b) || BLANK, ops: (b.pants && b.pants.o) || [] };
});

const pickFlame = async (P) => {
  const opened = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-note button')]
      .find((x) => /designs/i.test(x.textContent || ''));
    if (!b) return false;
    b.click(); return true;
  });
  await P.page.waitForTimeout(700);
  const picked = await P.page.evaluate((name) => {
    const s = [...document.querySelectorAll('.bt-modal-scrim')];
    const g = s[s.length - 1];
    const t = g && [...g.querySelectorAll('button')]
      .find((b) => b.querySelector('canvas') && (b.textContent || '').trim() === name);
    if (!t) return false;
    t.click(); return true;
  }, FLAME.name);
  await P.page.waitForTimeout(1000);
  return opened && picked;
};

/* A gesture on the pants grid, in CELLS, through the surface's projection.
   `cells` is the path: one cell is a tap, two or more a drag (with a midpoint,
   because the panel ignores a move onto the cell it already handled). */
async function gesture(P, cells) {
  const ok = await P.page.evaluate((path) => {
    const cv = document.querySelector('.bt-bodyink-cv');
    const aim = cv && cv.__btInkAim;
    if (!cv || !aim) return false;
    const a = Object.keys(aim).map((k) => aim[k]).find((v) => v && v.target === 'pants');
    if (!a || !(a.gw > 0)) return false;
    const r = cv.getBoundingClientRect();
    const kx = r.width / cv.width, ky = r.height / cv.height;
    const pt = (c) => ({
      x: r.left + (a.gx0 + ((c[0] + 0.5) * a.gw) / 16) * kx,
      y: r.top + (a.gy0 + ((c[1] + 0.5) * a.gh) / 16) * ky,
    });
    const ev = (type, p) => cv.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: 11, pointerType: 'touch', isPrimary: true,
      clientX: p.x, clientY: p.y, buttons: type === 'pointerup' ? 0 : 1 }));
    const pts = path.map(pt);
    ev('pointerdown', pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      ev('pointermove', { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 });
      ev('pointermove', p1);
    }
    ev('pointerup', pts[pts.length - 1]);
    return true;
  }, cells);
  await P.page.waitForTimeout(600);
  return ok;
}

/* A cell this op paints that NO later op covers -- what a finger taps to pick
   it up -- nearest its box's centre. */
function grabCell(ops, idx) {
  const out = [];
  replay(BLANK, ops, out);
  const mine = out[idx] || [];
  const later = new Set();
  for (let k = idx + 1; k < out.length; k++) for (const c of out[k]) later.add(c[0] + ',' + c[1]);
  const a = ops[idx].a;
  const cx = (a[0] + a[2]) / 2, cy = (a[1] + a[3]) / 2;
  let best = null, bd = Infinity;
  for (const c of mine) {
    if (later.has(c[0] + ',' + c[1])) continue;
    const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

const clickIn = (P, sel, re) => P.page.evaluate(([s, src]) => {
  const rx = new RegExp(src, 'i');
  const b = [...document.querySelectorAll(s)].find((x) => rx.test((x.textContent || '').trim()));
  if (!b || b.disabled) return false;
  b.click(); return true;
}, [sel, re.source]).then(async (v) => { await P.page.waitForTimeout(600); return v; });
const layerAt = (P) => P.page.textContent('.bt-paint-layer-at').catch(() => '');

/* Size a just-placed full-grid design down to 8x8 from its corner handle and
   move it so its top-left lands at (tx, ty).  Returns the op's final box. */
async function sizeAndPlace(P, idx, tx, ty) {
  let { ops } = await pantsOps(P);
  const h = ops[idx].a;
  /* the handle is drawn PINNED onto the grid (handleAt) */
  const hx = Math.max(0, Math.min(15, h[2])), hy = Math.max(0, Math.min(15, h[3]));
  await gesture(P, [[hx, hy], [h[0] + 7, h[1] + 7]]);
  ({ ops } = await pantsOps(P));
  const g = grabCell(ops, idx);
  const a = ops[idx].a;
  if (g) await gesture(P, [g, [g[0] + (tx - a[0]), g[1] + (ty - a[1])]]);
  ({ ops } = await pantsOps(P));
  return ops[idx] ? ops[idx].a.slice() : null;
}

async function figureRead(P, tag) {
  let best = null;
  for (let i = 0; i < 6; i++) {
    const box = await H.figureBox(P).catch(() => null);
    if (box) {
      const px = await H.screenshotPixels(P, box);
      const n = px.count(isFlame);
      if (!best || n > best.n) best = { n, box };
      if (n > 0 && i >= 1) break;
    }
    await P.page.waitForTimeout(900);
  }
  if (best && tag) {
    const b = best.box;
    const pad = Math.round(40 * (b.k || 1));
    const clip = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad),
      width: b.width + pad * 2, height: b.height + pad * 2 };
    await P.page.screenshot({ path: `${SHOTS}-${tag}.png`, clip }).catch(() => {});
  }
  return best;
}

const holdsArt = (obj, art) => JSON.stringify(obj || {}).includes(art);

export async function run({ browser, wsPort, webPort, rec }) {
  const tag = 'manydesigns';
  rec.ok(`${tag}: the catalogue has the Flame (guard)`, !!FLAME);
  if (!FLAME) return;

  /* ── the editor's two new rules, read straight off artOps (no browser) ── */
  {
    const full = { k: 'd', art: FLAME.art, a: [0, 0, 15, 15] };
    const c1 = copyOfOp(full, (x) => sameOp(x, full));
    const c2 = copyOfOp(full, (x) => sameOp(x, full) || sameOp(x, c1));
    rec.ok(`${tag}: a copy steps two cells aside, passes the load gate, and a third never lands `
      + `on the second (${c1 && c1.a.join(',')} / ${c2 && c2.a.join(',')})`,
      !!c1 && !!c2 && !!sanitizeOp(c1) && !!sanitizeOp(c2) && c1.art === FLAME.art
      && Math.abs(c1.a[0]) === 2 && !sameOp(c1, c2) && !sameOp(c2, full), { c1: c1 && c1.a, c2: c2 && c2.a });
    const edge = { k: 'd', art: FLAME.art, a: [8, 8, 15, 15] };
    const ce = copyOfOp(edge, null);
    rec.ok(`${tag}: a copy of a design in the corner steps INWARD, keeping it on the grid (${ce && ce.a.join(',')})`,
      !!ce && ce.a[0] === 6 && ce.a[1] === 6, ce && ce.a);
    rec.ok(`${tag}: a freehand stroke and a fill have no box, so no copy`,
      copyOfOp({ k: 'c', c: [1, 2], i: 3 }, null) === null && copyOfOp({ k: 'f', x: 1, y: 1, i: 3, m: 0 }, null) === null);
    const blue = recolorDesign(full, 8);
    rec.ok(`${tag}: recolouring a design repaints its main colour and keeps its dark outline`,
      blue.art.indexOf('4') < 0 && blue.art.split('8').length - 1 === FLAME.art.split('4').length - 1
      && blue.art.split('1').length === FLAME.art.split('1').length && recolorDesign(full, 4) === full);
  }

  /* ── 0. THE CONTROL: a plain bro, no drawing anywhere ── */
  const C = await H.newPlayer(browser, { name: 'Plain', wsPort, webPort, viewport: PHONE,
    touch: true, dpr: 2, world: 'wheel', init: COACH_OFF });
  await H.enterWorld(C);
  await C.page.waitForTimeout(3000);
  const plain = await figureRead(C, 'control');
  rec.ok(`${tag}: the control bro can be found (guard)`, !!plain, plain && { n: plain.n });
  rec.ok(`${tag}: with no drawing, almost no flame red is on him (${plain && plain.n} px) -- the `
    + `count below measures his trousers, not the town`, !!plain && plain.n < 12, plain && { n: plain.n });
  await C.ctx.close();

  /* ── 1. TWO FLAMES ON THE PANTS ── */
  const P = await H.newPlayer(browser, { name: 'Flames', wsPort, webPort, viewport: PHONE,
    touch: true, dpr: 2, world: 'wheel', init: COACH_OFF });
  await openCreator(P);
  rec.ok(`${tag}: the Pants editor opens on its Draw screen, on the trousers (guard)`,
    await openPantsEditor(P));
  rec.ok(`${tag}: the trousers start blank (guard)`, (await pantsArt(P)) === BLANK);

  rec.ok(`${tag}: the first Flame is picked from the gallery`, await pickFlame(P));
  let s = await pantsOps(P);
  rec.ok(`${tag}: ...and lands as one design op`, s.ops.length === 1 && s.ops[0].k === 'd'
    && s.ops[0].art === FLAME.art, s.ops);
  const boxA = await sizeAndPlace(P, 0, 0, 4);
  rec.ok(`${tag}: it is sized and moved onto the left leg (${boxA && boxA.join(',')})`,
    !!boxA && boxA[2] - boxA[0] < 15, boxA);
  await clickIn(P, '.bt-paint-shapeops button', /^place$/);
  const firstOp = (await pantsOps(P)).ops[0];

  rec.ok(`${tag}: the SECOND Flame is picked from the gallery`, await pickFlame(P));
  s = await pantsOps(P);
  rec.ok(`${tag}: picking a second design ADDS it -- two design ops, and the first is exactly `
    + `as it was (it used to be replaced)`,
    s.ops.length === 2 && JSON.stringify(s.ops[0]) === JSON.stringify(firstOp)
    && s.ops[1].k === 'd' && s.ops[1].art === FLAME.art, s.ops);
  rec.ok(`${tag}: ...and the new one is the one held (${(await layerAt(P)).trim()})`,
    /layer\s*2\s*of\s*2/i.test(await layerAt(P)));
  const boxB = await sizeAndPlace(P, 1, 8, 4);
  rec.ok(`${tag}: the second is sized and moved onto the right leg (${boxB && boxB.join(',')})`,
    !!boxB && boxB[2] - boxB[0] < 15 && boxB[0] > (boxA ? boxA[0] : 0), boxB);
  await clickIn(P, '.bt-paint-shapeops button', /^place$/);

  s = await pantsOps(P);
  const two = await pantsArt(P);
  const cellsEach = [];
  replay(BLANK, s.ops, cellsEach);
  const covered = new Set((cellsEach[1] || []).map((c) => c[0] + ',' + c[1]));
  const firstShowing = (cellsEach[0] || []).filter((c) => !covered.has(c[0] + ',' + c[1])).length;
  rec.ok(`${tag}: the trousers hold BOTH flames -- two design ops, and the drawing is exactly `
    + `their replay`, s.ops.length === 2 && s.ops.every((o) => o.k === 'd' && o.art === FLAME.art)
    && replay(s.base, s.ops) === two, { ops: s.ops.map((o) => o.a) });
  rec.ok(`${tag}: ...and the first flame is still on show (${firstShowing} of its `
    + `${(cellsEach[0] || []).length} cells not under the second)`,
    firstShowing >= 12, { firstShowing });
  await P.page.screenshot({ path: `${SHOTS}-creator-two-flames.png` }).catch(() => {});

  /* ── 2. COPY ── */
  const g1 = grabCell(s.ops, 1);
  await gesture(P, [g1]);
  rec.ok(`${tag}: tapping the second flame with Select picks it up (${(await layerAt(P)).trim()})`,
    /layer\s*2\s*of\s*2/i.test(await layerAt(P)));
  const copyBtn = await P.page.evaluate(() => {
    const b = document.querySelector('.bt-paint-shapeops [data-paint-copy]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: (b.textContent || '').trim(), w: Math.round(r.width), h: Math.round(r.height),
      hit: !!e && (e === b || b.contains(e)), touch: getComputedStyle(b).touchAction };
  });
  rec.ok(`${tag}: the Select row offers Copy, a real tap reaches it, touch-action manipulation `
    + `(${JSON.stringify(copyBtn)})`,
    !!copyBtn && copyBtn.text === 'Copy' && copyBtn.hit && copyBtn.h >= 30
    && /manipulation/.test(copyBtn.touch), copyBtn);
  await P.page.click('.bt-paint-shapeops [data-paint-copy]');
  await P.page.waitForTimeout(700);
  const c3 = await pantsOps(P);
  const src = c3.ops[1], cp = c3.ops[2];
  const w = (o) => o.a[2] - o.a[0], h = (o) => o.a[3] - o.a[1];
  rec.ok(`${tag}: Copy makes a second IDENTICAL design -- same picture, same size, a step `
    + `away (${src && src.a.join(',')} -> ${cp && cp.a.join(',')})`,
    c3.ops.length === 3 && !!cp && cp.k === 'd' && cp.art === src.art
    && w(cp) === w(src) && h(cp) === h(src) && cp.a.join(',') !== src.a.join(',')
    && Math.abs(cp.a[0] - src.a[0]) <= 2 && Math.abs(cp.a[1] - src.a[1]) <= 2, c3.ops);
  rec.ok(`${tag}: ...the copy is the one held now (${(await layerAt(P)).trim()})`,
    /layer\s*3\s*of\s*3/i.test(await layerAt(P)));
  await P.page.screenshot({ path: `${SHOTS}-creator-copy.png` }).catch(() => {});
  await clickIn(P, '.bt-paint button', /^undo$/);
  rec.ok(`${tag}: ONE Undo takes the copy away, and only the copy`,
    (await pantsArt(P)) === two && (await pantsOps(P)).ops.length === 2);
  await clickIn(P, '.bt-paint button', /^redo$/);
  rec.ok(`${tag}: Redo brings the copy back`, (await pantsOps(P)).ops.length === 3);
  await clickIn(P, '.bt-paint button', /^undo$/);
  rec.ok(`${tag}: ...and Undo again leaves the two flames (guard)`, (await pantsArt(P)) === two);

  /* ── 3. DELETE, AND RECOLOUR ── */
  s = await pantsOps(P);
  await clickIn(P, '.bt-paint-tools button', /select/);
  await gesture(P, [grabCell(s.ops, 0)]);
  rec.ok(`${tag}: the first flame can be picked up on its own (${(await layerAt(P)).trim()})`,
    /layer\s*1\s*of\s*2/i.test(await layerAt(P)));
  await P.page.click('[aria-label="Colour 8"]');
  await P.page.waitForTimeout(600);
  const rc = (await pantsOps(P)).ops;
  rec.ok(`${tag}: a palette tap recolours the held design's main colour (orange -> blue), `
    + `and only that one`,
    rc.length === 2 && rc[0].art !== FLAME.art && rc[0].art.indexOf('4') < 0
    && rc[0].art.indexOf('8') >= 0 && rc[1].art === FLAME.art, rc.map((o) => o.art.slice(80, 112)));
  await clickIn(P, '.bt-paint button', /^undo$/);
  rec.ok(`${tag}: one Undo puts its colours back`, (await pantsArt(P)) === two);
  await gesture(P, [grabCell((await pantsOps(P)).ops, 0)]);
  await P.page.click('[data-paint-delete]');
  await P.page.waitForTimeout(600);
  const del = (await pantsOps(P)).ops;
  rec.ok(`${tag}: Delete takes the held flame off and leaves the other`,
    del.length === 1 && JSON.stringify(del[0]) === JSON.stringify(s.ops[1]), del);
  await clickIn(P, '.bt-paint button', /^undo$/);
  rec.ok(`${tag}: one Undo puts it back, both flames as they were`,
    (await pantsArt(P)) === two && (await pantsOps(P)).ops.length === 2);

  /* ── 4. THE WORLD ── */
  await clickIn(P, '.bt-paint-btn button', /^done$/);
  await P.page.waitForTimeout(800);
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);
  const me = await P.page.evaluate(() => ({
    myId: window._gameState.current.myId,
    zone: window._gameState.current.currentZone,
    art: localStorage.getItem('bt-pantsart'),
    bake: window.__btArtForFacing ? window.__btArtForFacing('south') : null,
    top: (document.body.innerText || '').slice(0, 400),
  }));
  rec.ok(`${tag}: he is in the world, in BroTown (zone ${me.zone})`,
    me.zone === 'wheel' && /BroTown/.test(me.top), { zone: me.zone });
  rec.ok(`${tag}: his trousers are still the two-flame drawing`, me.art === two);
  rec.ok(`${tag}: ...and that is what the world's body bake paints on him (__btArtForFacing)`,
    !!me.bake && me.bake.pants === two, me.bake && { pants: (me.bake.pants || '').slice(0, 32) });
  const admin = await H.adminPlayer(wsPort, me.myId).catch(() => null);
  rec.ok(`${tag}: the worker's record holds the two-flame drawing (saved)`, holdsArt(admin, two));
  const worn = await figureRead(P, 'world-two-flames');
  rec.ok(`${tag}: the flames are ON HIM in the world -- ${worn && worn.n} px of flame red on his `
    + `figure against ${plain && plain.n} on the plain control`,
    !!worn && !!plain && worn.n >= plain.n + 8, { worn: worn && worn.n, plain: plain && plain.n });

  /* ── 5. SAVE + RELOAD ── */
  await P.page.reload();
  await H.enterWorld(P);
  await P.page.waitForTimeout(3500);
  const back = await P.page.evaluate(() => ({
    art: localStorage.getItem('bt-pantsart'),
    bake: window.__btArtForFacing ? window.__btArtForFacing('south') : null,
  }));
  const backOps = await pantsOps(P);
  rec.ok(`${tag}: after a reload his trousers are the two-flame drawing`, back.art === two);
  rec.ok(`${tag}: ...the world paints them on him`, !!back.bake && back.bake.pants === two);
  rec.ok(`${tag}: ...and both flames are still separate designs the editor can pick apart`,
    backOps.ops.length === 2 && backOps.ops.every((o) => o.k === 'd' && o.art === FLAME.art)
    && replay(backOps.base, backOps.ops) === two, backOps.ops.map((o) => o.a));
  const worn2 = await figureRead(P, 'world-after-reload');
  rec.ok(`${tag}: ...and on his figure (${worn2 && worn2.n} px of flame red)`,
    !!worn2 && !!plain && worn2.n >= plain.n + 8, { n: worn2 && worn2.n });
  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok(`${tag}: no page errors`, errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();

  /* ── 6. AN OLD LOOK STILL LOADS ──
     The form the previous editor wrote: ONE design op over a base (here a drawn
     stripe, so "the base is kept" is not vacuous), and the art it replays to. */
  const stripe = [...BLANK].map((c, i) => ((i >> 4) === 14 ? '8' : '0')).join('');
  const oldOp = { k: 'd', art: FLAME.art, a: [0, 0, 15, 15] };
  const oldArt = replay(stripe, [oldOp]);
  const O = await H.newPlayer(browser, { name: 'OldLook', wsPort, webPort, viewport: PHONE,
    touch: true, dpr: 2, world: 'wheel', init: COACH_OFF + `
try {
  localStorage.setItem('bt-pantsart', ${JSON.stringify(oldArt)});
  localStorage.setItem('bt-artops', ${JSON.stringify(JSON.stringify({ pants: { b: stripe, o: [oldOp] } }))});
} catch (e) {}` });
  await openCreator(O);
  await openPantsEditor(O);
  const o1 = await pantsOps(O);
  rec.ok(`${tag}: an old one-design look loads whole -- its drawing, its base and its one `
    + `design op`, (await pantsArt(O)) === oldArt && o1.base === stripe && o1.ops.length === 1
    && JSON.stringify(o1.ops[0]) === JSON.stringify(oldOp), o1.ops);
  await pickFlame(O);
  const o2 = await pantsOps(O);
  rec.ok(`${tag}: ...and a second Flame goes on top of it, stepping aside from the first `
    + `(${o2.ops[1] && o2.ops[1].a.join(',')})`,
    o2.ops.length === 2 && JSON.stringify(o2.ops[0]) === JSON.stringify(oldOp)
    && o2.ops[1].a.join(',') !== oldOp.a.join(',') && o2.base === stripe
    && (await pantsArt(O)) === replay(stripe, o2.ops), o2.ops);
  /* the stripe row the flames do not cover is still the old base's */
  const after = await pantsArt(O);
  const stripeLeft = [...after.slice(14 * 16, 15 * 16)].filter((c) => c === '8').length;
  rec.ok(`${tag}: ...and the old drawing under them is untouched (${stripeLeft} stripe cells showing)`,
    stripeLeft > 0, { stripeLeft });
  await O.ctx.close();
  console.log(`    screenshots: ${SHOTS}-{control,creator-two-flames,creator-copy,world-two-flames,world-after-reload}.png`);
}
