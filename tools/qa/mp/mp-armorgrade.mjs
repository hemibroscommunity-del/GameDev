/* ═══ WORN ARMOUR SHOWS ITS GRADE (v2.3.3142; v2.3.3953: a soft glow outside it, on every facing) ═══
 *
 * Owner (v2.3.3142): "I also think the armor should be visibly different if
 * you're wearing rare, elite, or godly ... So rare is blue, elite is orange,
 * godly is prismatic".
 * Owner (v2.3.3953): "The outline effects of the rare, elite etc armor needs
 * fixed. It doesn't show while jogging in some directions. I also want it to
 * be less of a hard outline and more of a tight glow. But i don't want it to
 * eat into armor that's already there: it makes the armor look too small
 * otherwise."
 *
 * The shine's own filter draws it (src/rendering/lightfx/glint.js GRADE_LOOK):
 * a soft glow in the grade's colour OUTSIDE the piece, under it, and the
 * piece's highlights lit in that colour.  In the world (world: 'wheel'), on a
 * phone:
 *   1. standing, every metal (copper, iron, steel) in every grade, one frozen
 *      frame per metal: the probe says each piece wears its grade and a
 *      normal piece none; the glow is OUTSIDE the art (the armour's own
 *      footprint, found by drawing the frame with the pieces held back) --
 *      blue for rare, orange for elite, many hues for godly -- reaches no
 *      further than its two steps, and the art's edge is not repainted (its
 *      outer band changes no more than its middle: the old inner outline
 *      changed nearly all of it); copper's highlights stay copper-warm;
 *   2. JOGGING, all eight facings, in a full iron set (one picture on the
 *      body sprite on six of them, the pieces apart on north-east and
 *      north-west): plain torso over ELITE greaves -- the glow drawn on every
 *      facing, orange, below the waist; a RARE torso over elite greaves --
 *      blue above the waist, orange below; the figure's art not repainted;
 *   3. jogging east with a sword out in a godly full set, the arm drawn again
 *      over the sword (a masked clone of the body) wears the body's own look:
 *      the same picture, place, filter frame and grade uniforms;
 *   4. a grade is drawn with the light effects switched OFF too, and only on
 *      the graded pieces;
 *   5. ANOTHER player sees it: A wears a plain iron torso and ELITE greaves
 *      the worker minted, by their ids; B is told `eqg: 'ne'` and, A jogging,
 *      draws A's figure plain above the waist and elite below; then elite
 *      both ('ee') standing;
 *   6. the bag says the same: an elite piece's edge orange, a godly piece's
 *      ring a rainbow;
 *   7. no page errors.
 * Pictures: tools/qa/mp/out/armorgrade-*.png -- the standing grid of twelve
 * and the jog grid (armorgrade-jog-grid.png: the eight facings, plain, plain
 * over elite, rare over elite).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const DPR = 2;
const COACH_OFF = () => {
  try {
    const l = ['openDash', 'move', 'equip', 'dashAfterTurnIn', 'equipAll', 'cycle',
      'blockRanged', 'attack', 'special', 'chatTap', 'passkey'];
    const o = {}; for (const k of l) o[k] = true;
    localStorage.setItem('bt_coach_v1', JSON.stringify(o));
  } catch (e) { /* private mode */ }
};
const FACINGS = [['east', 0], ['southeast', 1], ['south', 2], ['southwest', 3], ['west', 4], ['northwest', 5], ['north', 6], ['northeast', 7]];
/* the facings that draw the pieces apart while jogging (no full-set figure) */
const LAYERED = new Set(['northeast', 'northwest']);

/* a new character's WELCOME plate (v2.3.2890) sits over the top of the
   screen; its own Skip tutorial button takes it down (mp-figureseam's way) */
const skipWelcome = async (P) => {
  for (let i = 0; i < 60; i++) {
    const up = await P.page.evaluate(() => {
      const b = document.querySelector('[data-skip-tutorial]');
      if (b) b.click();
      return !!document.querySelector('[data-quest-banner="welcome"]');
    }).catch(() => true);
    if (!up) break;
    await P.page.waitForTimeout(250);
  }
};
const probe = (P) => P.page.evaluate(() => (window.__btLightFx ? window.__btLightFx.probe() : null));
const setGear = (P, slot, id) => P.page.evaluate(({ s, i }) => { if (window.__btSetGear) window.__btSetGear(s, i); }, { s: slot, i: id });
/* a RENDER check of your own figure: the grades are set on this client only
   (the torso's, then the greaves') */
const setGrades = (P, qc, ql = qc) => P.page.evaluate(([c, l]) => {
  const R = window._gameState.current.rpg;
  R.armor = Object.assign({}, R.armor || {}, { quality: c, prov: 'minted' });
  R.legsArmor = Object.assign({}, R.legsArmor || {}, { quality: l, prov: 'minted' });
}, [qc, ql]);
const stick = (P, x, y) => P.page.evaluate(([x, y]) => { const S = window._gameState.current; S.stickX = x; S.stickY = y; }, [x, y]);
/* one frozen frame, the renderer driven by hand (mp-sheen's method) */
const freeze = async (P) => {
  await P.page.evaluate(() => new Promise((res) => {
    const R = window._pixiRenderer;
    if (!R.__agWrapped) {
      const orig = R.update;
      R.update = function (...args) { window.__agArgs = args; return orig.apply(this, args); };
      R.__agWrapped = true;
    }
    window.__agArgs = null;
    const wait = () => (window.__agArgs ? res() : setTimeout(wait, 16));
    wait();
  }));
  await P.page.evaluate(() => {
    if (window.__agHeld) return;
    window.__agReal = window.requestAnimationFrame.bind(window);
    window.__agHeld = [];
    window.requestAnimationFrame = (cb) => { window.__agHeld.push(cb); return 0; };
    window.__agT = Date.now();
    window.__agPT = performance.now();
  });
  await P.page.waitForTimeout(120);
};
const thaw = (P) => P.page.evaluate(() => {
  if (!window.__agHeld) return;
  const held = window.__agHeld;
  window.requestAnimationFrame = window.__agReal;
  window.__agHeld = null;
  for (const cb of held) window.requestAnimationFrame(cb);
});
const drawFrozen = (P) => P.page.evaluate(() => {
  const dn = Date.now, pn = performance.now.bind(performance);
  Date.now = () => window.__agT;
  performance.now = () => window.__agPT;
  try { window._pixiRenderer.update(...window.__agArgs); } finally { Date.now = dn; performance.now = pn; }
});
/* the frozen frame drawn with some of the figure's sprites held back */
const drawHeld = async (P, keys) => {
  await P.page.evaluate((ks) => {
    const pd = window._pixiRenderer.playerDisplayRaw();
    window.__agHidden = [];
    for (const k of ks) if (pd[k] && pd[k].renderable !== false) { pd[k].renderable = false; window.__agHidden.push(k); }
  }, keys);
  await drawFrozen(P);
};
const unhold = (P) => P.page.evaluate(() => {
  const pd = window._pixiRenderer.playerDisplayRaw();
  for (const k of window.__agHidden || []) if (pd[k]) pd[k].renderable = true;
  window.__agHidden = [];
});
const ARMOUR_LAYERS = ['_gearChest', '_gearLegs'];
const FIGURE_LAYERS = ['_spriteBody', '_handArmSprite', '_handCapSprite', '_handArmChest', '_handArmLegs', '_gearChest', '_gearLegs'];

/* ── the pictures' arithmetic ──
   `art`: the armour's footprint -- the pixels that change when its sprites
   are held back.  `depth`: each pixel's distance (in device px, chessboard)
   from the other side of the art's edge: inside the art, how deep; outside,
   how far out. */
const sum3 = (a, b, o) => Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]);
function artMask(shown, held) {
  const n = shown.width * shown.height, m = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (sum3(shown, held, i * shown.channels) > 24) m[i] = 1;
  return m;
}
function depthMap(mask, w, h, inside) {
  const INF = 1e9, d = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = (mask[i] === 1) === inside ? INF : 0;
  for (let pass = 0; pass < 2; pass++) {
    const ys = pass ? [h - 1, -1, -1] : [0, h, 1], xs = pass ? [w - 1, -1, -1] : [0, w, 1];
    for (let y = ys[0]; y !== ys[1]; y += ys[2]) {
      for (let x = xs[0]; x !== xs[1]; x += xs[2]) {
        const i = y * w + x;
        if (!d[i]) continue;
        let v = d[i];
        for (const [dx, dy] of pass ? [[1, 0], [0, 1], [1, 1], [-1, 1]] : [[-1, 0], [0, -1], [-1, -1], [1, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          v = Math.min(v, d[yy * w + xx] + 1);
        }
        d[i] = v;
      }
    }
  }
  return d;
}
const hueBin = (r, g, b) => {
  const R = r / 255, G = g / 255, B = b / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  if (mx - mn <= 0.25) return -1;
  let h;
  if (mx === R) h = ((G - B) / (mx - mn)) % 6; else if (mx === G) h = (B - R) / (mx - mn) + 2; else h = (R - G) / (mx - mn) + 4;
  return Math.floor(((h * 60 + 360) % 360) / 30);
};
/* What a grade changed against the same frame in plain armour, read against
   the art's footprint:
     glow   the changed pixels OUTSIDE the art (40+ levels over the three
            channels): how many, their mean colour, how many hues, how far
            out the farthest is (device px), and their mean colour above and
            below `waistY` (a device-px row; null: no split);
     ring   the art's outer band (2-3 device px in: the old outline's width)
            and its middle (5+ px in): the share of each changed by 120+ (the
            highlights change some anywhere; the old outline nearly all the
            band);
     light  the art's pixels changed by 30-120 (the highlights), 2+ device px
            in (the soft edge has the glow under it): mean colour. */
function gradeDiff(base, img, mask, waistY = null) {
  const w = img.width, h = img.height, ch = img.channels;
  const dIn = depthMap(mask, w, h, true), dOut = depthMap(mask, w, h, false);
  const g = { n: 0, r: 0, g: 0, b: 0, hues: new Set(), far: 0, up: { n: 0, r: 0, g: 0, b: 0 }, down: { n: 0, r: 0, g: 0, b: 0 } };
  const ring = { n: 0, hit: 0 }, mid = { n: 0, hit: 0 }, light = { n: 0, r: 0, g: 0, b: 0 };
  for (let i = 0; i < w * h; i++) {
    const o = i * ch, d = sum3(img, base, o);
    if (mask[i]) {
      const dp = dIn[i];
      const band = dp >= 2 && dp <= 3 ? ring : dp >= 5 ? mid : null;
      if (band) { band.n++; if (d >= 120) band.hit++; }
      if (d >= 30 && d < 120 && dp >= 2) { light.n++; light.r += img.data[o]; light.g += img.data[o + 1]; light.b += img.data[o + 2]; }
      continue;
    }
    if (d < 40) continue;
    g.n++; g.r += img.data[o]; g.g += img.data[o + 1]; g.b += img.data[o + 2];
    const hb = hueBin(img.data[o], img.data[o + 1], img.data[o + 2]);
    if (hb >= 0) g.hues.add(hb);
    if (dOut[i] > g.far) g.far = dOut[i];
    if (waistY != null) {
      const k = Math.floor(i / w) < waistY ? g.up : g.down;
      k.n++; k.r += img.data[o]; k.g += img.data[o + 1]; k.b += img.data[o + 2];
    }
  }
  const mean = (k) => (k.n ? [Math.round(k.r / k.n), Math.round(k.g / k.n), Math.round(k.b / k.n)] : null);
  return {
    glow: { n: g.n, rgb: mean(g), hues: g.hues.size, far: g.far, up: { n: g.up.n, rgb: mean(g.up) }, down: { n: g.down.n, rgb: mean(g.down) } },
    ring: { n: ring.n, share: ring.n ? +(ring.hit / ring.n).toFixed(3) : 0 },
    mid: { n: mid.n, share: mid.n ? +(mid.hit / mid.n).toFixed(3) : 0 },
    light: { n: light.n, rgb: mean(light) },
  };
}
const bluish = (c) => !!c && c[2] > c[0] + 20;
const orange = (c) => !!c && c[0] > c[1] && c[1] > c[2] && c[0] > c[2] + 60;
/* the art is not repainted: its outer band changes no more than its middle
   (by more than a few points) -- v2.3.3142's inner outline changed most of it */
const notEaten = (x) => x.ring.n > 20 && x.ring.share <= x.mid.share + 0.08;

/* the pictures, laid out on a scratch page: rows of tiles under labels */
async function grid(P, rows, cols, tiles, W, Hh, out) {
  const scratch = await P.ctx.newPage();
  await scratch.setContent('<html><body style="margin:0;background:#1E2E34"><canvas id="c"></canvas></body></html>').catch(() => {});
  const url = await scratch.evaluate(async ({ rows, cols, tiles, W, Hh }) => {
    const cv = document.getElementById('c');
    const S = 2, pad = 12, top = 40, left = 210;
    cv.width = left + cols.length * (W * S + pad); cv.height = top + rows.length * (Hh * S + pad);
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#1E2E34'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#F4F0E7'; x.font = '700 20px sans-serif'; x.textAlign = 'center';
    cols.forEach((c, i) => x.fillText(c, left + i * (W * S + pad) + (W * S) / 2, 28));
    x.textAlign = 'right';
    rows.forEach((r, i) => x.fillText(r, left - 12, top + i * (Hh * S + pad) + (Hh * S) / 2));
    for (let i = 0; i < tiles.length; i++) {
      if (!tiles[i]) continue;
      const im = new Image();
      await new Promise((r) => { im.onload = r; im.onerror = r; im.src = 'data:image/png;base64,' + tiles[i]; });
      x.drawImage(im, left + (i % cols.length) * (W * S + pad), top + Math.floor(i / cols.length) * (Hh * S + pad), W * S, Hh * S);
    }
    return cv.toDataURL('image/png');
  }, { rows, cols, tiles, W, Hh });
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await scratch.close().catch(() => {});
}

export async function run(ctx) {
  const opened = [];
  try { await scenario(ctx, opened); } finally {
    for (const P of opened) await P.ctx.close().catch(() => {});
  }
}

async function scenario({ browser, wsPort, webPort, rec }, opened) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const errors = [];
  const G = await H.wheelGeom();
  const A = await H.newPlayer(browser, { name: 'Gleam', wsPort, webPort, viewport: PHONE, touch: true, dpr: DPR, world: 'wheel', init: COACH_OFF });
  opened.push(A);
  A.page.on('pageerror', (e) => errors.push('A: ' + String(e).slice(0, 200)));
  const stopA = H.keepAlive(A);
  try {
    await H.enterWorld(A);
    const inW = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the world' }).catch(() => null);
    rec.ok('in the world (guard)', !!inW, inW);
    if (!inW) return;
    const aId = await H.readState(A, (S) => S.myId);
    await A.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
    /* every quest done, so no townsperson's tutorial line covers the figure */
    await H.devOp(wsPort, 'quests', aId).catch(() => {});
    await H.devOp(wsPort, 'vitals', aId, { heal: true, god: true, godMinutes: 60 }).catch(() => {});
    await skipWelcome(A);
    for (let i = 0; i < 3; i++) { await H.closeNpcDialogue(A).catch(() => {}); await A.page.waitForTimeout(200); }
    const HOME = { x: G.arrival.x, y: G.arrival.y };
    await H.hopTo(A, HOME.x, HOME.y).catch(() => {});
    await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.glint(-1); });
    await A.page.waitForTimeout(800);

    /* ── 1. standing: every metal in every grade ── */
    const fb = await H.figureBox(A, { pad: 26 });
    rec.ok('the figure is on screen to be pictured (guard)', !!fb, fb);
    if (!fb) return;
    const box = { x: fb.x, y: fb.y, width: fb.width, height: fb.height };
    const GRADES = ['normal', 'rare', 'elite', 'godly'];
    const METALS = ['copper', 'iron', 'steel'];
    const shots = {}, probes = {}, masks = {}, bufs = {};
    /* ONE frozen frame per metal, its four grades drawn on it in turn: between
       two frames the idle animation moves the figure */
    for (const metal of METALS) {
      await setGear(A, 'chest', metal === 'steel' ? 'steelplate' : metal + 'plate');
      await setGear(A, 'legs', metal === 'steel' ? 'steelgreaves' : metal + 'greaves');
      await setGrades(A, 'normal');
      await A.page.waitForTimeout(600);
      await freeze(A);
      for (const g of GRADES) {
        await setGrades(A, g);
        await drawFrozen(A);
        probes[metal + ':' + g] = (await probe(A)).glint;
        bufs[metal + ':' + g] = await A.page.screenshot({ path: join(OUT, `armorgrade-${metal}-${g}.png`), clip: box });
        shots[metal + ':' + g] = H.decodePng(bufs[metal + ':' + g]);
      }
      await setGrades(A, 'normal');
      await drawHeld(A, ARMOUR_LAYERS);
      const held = H.decodePng(await A.page.screenshot({ clip: box }));
      await unhold(A);
      await drawFrozen(A);
      masks[metal] = artMask(shots[metal + ':normal'], held);
      await thaw(A);
    }
    const pr = (m, g) => probes[m + ':' + g] || {};
    rec.ok('a normal piece wears no grade; a rare, elite or godly one wears its own on both pieces',
      METALS.every((m) => Object.keys(pr(m, 'normal').grades || {}).length === 0
        && ['rare', 'elite', 'godly'].every((g) => (pr(m, g).grades || {})['self:c'] === g && (pr(m, g).grades || {})['self:l'] === g)),
      METALS.map((m) => GRADES.map((g) => pr(m, g).grades)));
    const d = {};
    for (const m of METALS) for (const g of ['rare', 'elite', 'godly']) d[m + ':' + g] = gradeDiff(shots[m + ':normal'], shots[m + ':' + g], masks[m]);
    console.log('    what each grade changed standing -- the glow outside the art, the art\'s outer band and middle, the highlights:');
    for (const k of Object.keys(d)) console.log('      ' + k.padEnd(14) + ' ' + JSON.stringify(d[k]));
    rec.ok('the armour\'s footprint is found (guard: holding its sprites back changes a figure\'s worth of pixels)',
      METALS.every((m) => masks[m].reduce((a, v) => a + v, 0) > 400), METALS.map((m) => masks[m].reduce((a, v) => a + v, 0)));
    const glow = (m, g) => d[m + ':' + g].glow;
    rec.ok('rare glows blue OUTSIDE the armour (its glow bluer than red), in every metal',
      METALS.every((m) => { const x = glow(m, 'rare'); return x.n > 150 && bluish(x.rgb); }), METALS.map((m) => glow(m, 'rare')));
    rec.ok('elite glows orange outside the armour (red over green over blue), in every metal',
      METALS.every((m) => { const x = glow(m, 'elite'); return x.n > 150 && orange(x.rgb); }), METALS.map((m) => glow(m, 'elite')));
    rec.ok('godly glows prismatic outside the armour: at least five of twelve hues, in every metal',
      METALS.every((m) => { const x = glow(m, 'godly'); return x.n > 150 && x.hues >= 5; }), METALS.map((m) => glow(m, 'godly')));
    /* tight: the glow's step is two game px (the probe's uRim, CSS px), and it
       reaches two steps out -- two device px of slack for the art's soft edge */
    const rim = Math.max(...METALS.map((m) => Math.max(0, ...Object.values(pr(m, 'rare').rims || {}))));
    const reach = Math.ceil(2 * rim * DPR) + 2;
    rec.ok(`the glow is TIGHT: nothing changes more than two of its steps out (${reach} device px; the step ${rim} CSS px, two game px)`,
      rim > 0 && rim < 4 && Object.values(d).every((x) => x.glow.far <= reach), { rim, reach, far: Object.fromEntries(Object.entries(d).map(([k, x]) => [k, x.glow.far])) });
    rec.ok('the glow does not eat into the armour: the art\'s outer band changes no more than its middle (v2.3.3142\'s outline repainted most of it), every metal and grade',
      Object.values(d).every(notEaten), Object.fromEntries(Object.entries(d).map(([k, x]) => [k, { ring: x.ring, mid: x.mid }])));
    /* v2.3.3953: read on the art's own pixels 2+ px in, at the world's zoom
       (a smaller figure than the old map's): rare's blue lifts the blue
       channel of each highlight, and copper stays red over blue by 25-30
       there, where the old count (every pixel changed a little, the outline's
       fringe included, on the old map) read 40+ */
    rec.ok('the metal keeps its own colour: on the copper set the highlights a grade lights stay copper-warm (red over blue), in every grade',
      ['rare', 'elite', 'godly'].every((g) => { const x = d['copper:' + g].light; return x.n > 0 && x.rgb[0] > x.rgb[2] + 20; }), ['rare', 'elite', 'godly'].map((g) => d['copper:' + g].light));
    await grid(A, ['Copper', 'Iron', 'Steel'], ['Normal', 'Rare', 'Elite', 'Godly'],
      METALS.flatMap((m) => GRADES.map((g) => bufs[m + ':' + g].toString('base64'))), box.width, box.height, join(OUT, 'armorgrade-grid.png'));

    /* ── 2. jogging, all eight facings, a full iron set in mixed grades ── */
    await setGear(A, 'chest', 'ironplate');
    await setGear(A, 'legs', 'irongreaves');
    await setGrades(A, 'normal');
    await A.page.waitForTimeout(600);
    const CASES = [['normal', 'normal'], ['normal', 'elite'], ['rare', 'elite']];
    const jogTiles = [], jog = {};
    for (const [dir, k] of FACINGS) {
      const ang = k * Math.PI / 4;
      await H.hopTo(A, HOME.x - Math.cos(ang) * 60, HOME.y - Math.sin(ang) * 60).catch(() => {});
      await stick(A, Math.cos(ang), Math.sin(ang));
      let facing = null;
      for (let i = 0; i < 40 && facing !== dir; i++) { await A.page.waitForTimeout(80); facing = await A.page.evaluate(() => window._gameState.current._renderFacing); }
      await A.page.waitForTimeout(500);
      await freeze(A);
      const jb = await H.figureBox(A, { pad: 22 });
      const r = { dir, facing, box: jb, probes: {}, imgs: {} };
      if (jb) {
        /* a little lower than the figure's box: its name plate out, its feet in */
        const clip = { x: jb.x, y: jb.y + 12, width: jb.width, height: Math.min(jb.height, PHONE.height - jb.y - 12) };
        for (const [c, l] of CASES) {
          await setGrades(A, c, l);
          await drawFrozen(A);
          r.probes[c + '/' + l] = (await probe(A)).glint;
          const buf = await A.page.screenshot({ clip });
          r.imgs[c + '/' + l] = H.decodePng(buf);
          jogTiles.push(buf.toString('base64'));
        }
        await setGrades(A, 'normal');
        await drawHeld(A, FIGURE_LAYERS);
        r.held = H.decodePng(await A.page.screenshot({ clip }));
        await unhold(A);
        /* the waist on the picture: the body sprite's frame through its
           transforms, and the row the glow turns at (the figure's own; the
           layered facings' torso meets its greaves near the table's mean) */
        r.waist = await A.page.evaluate(({ cx, cy, layered }) => {
          const pd = window._pixiRenderer.playerDisplayRaw();
          const sb = pd && pd._spriteBody;
          if (!sb) return null;
          const b = sb.getBounds();
          const split = layered ? 0.51 : (pd._fullsetWaist || 0);
          const cv = document.querySelector('canvas').getBoundingClientRect();
          return { split, full: !!pd._fullsetOn, y: cv.top + b.y + split * b.height - cy };
        }, { cx: clip.x, cy: clip.y, layered: LAYERED.has(dir) });
      } else for (let i = 0; i < CASES.length; i++) jogTiles.push(null);
      await thaw(A);
      await stick(A, 0, 0);
      await A.page.waitForTimeout(300);
      jog[dir] = r;
    }
    const jogOk = [];
    for (const [dir] of FACINGS) {
      const r = jog[dir];
      if (!r.box || !r.held || !r.waist) { jogOk.push({ dir, missing: true, facing: r.facing }); continue; }
      const mask = artMask(r.imgs['normal/normal'], r.held);
      const wy = Math.round(r.waist.y * DPR);
      const ne = gradeDiff(r.imgs['normal/normal'], r.imgs['normal/elite'], mask, wy);
      const re = gradeDiff(r.imgs['normal/normal'], r.imgs['rare/elite'], mask, wy);
      const pNE = r.probes['normal/elite'] || {}, pRE = r.probes['rare/elite'] || {};
      const layered = LAYERED.has(dir);
      const fig = (p) => (p.figures || {})['self:c'] || null;
      const probeOk = layered
        ? (pNE.grades || {})['self:l'] === 'elite' && !(pNE.grades || {})['self:c'] && (pRE.grades || {})['self:c'] === 'rare' && (pRE.grades || {})['self:l'] === 'elite'
        : !!fig(pNE) && fig(pNE).above === 'normal' && fig(pNE).below === 'elite' && fig(pNE).split > 0.4 && fig(pNE).split < 0.65
          && !!fig(pRE) && fig(pRE).above === 'rare' && fig(pRE).below === 'elite';
      jogOk.push({
        dir, facing: r.facing, full: r.waist.full, layered, probeOk,
        figNE: fig(pNE), figRE: fig(pRE),
        /* plain torso over elite greaves: an orange glow, and (on the figure)
           below the waist -- at most a sliver above it, the blend's rows */
        neDrawn: ne.glow.n > 60 && orange(ne.glow.rgb),
        neBelow: ne.glow.down.n >= 0.85 * ne.glow.n,
        /* rare over elite: blue above, orange below */
        reSplit: re.glow.up.n > 15 && re.glow.down.n > 30 && bluish(re.glow.up.rgb) && orange(re.glow.down.rgb),
        notEaten: notEaten(ne) && notEaten(re),
        ne: ne.glow, re: { up: re.glow.up, down: re.glow.down, n: re.glow.n }, ring: [ne.ring, ne.mid],
      });
    }
    console.log('    jogging, each facing:');
    for (const j of jogOk) console.log('      ' + JSON.stringify(j));
    const facingOk = (j) => !j.missing && j.facing === j.dir;
    rec.ok('the eight jog facings were all pictured, each facing the way it was asked (guard)', jogOk.every(facingOk), jogOk.map((j) => [j.dir, j.facing, !j.missing]));
    rec.ok('a full set jogs as ONE figure on six facings and as pieces on north-east and north-west (guard: the case being tested)',
      jogOk.every((j) => j.missing || j.full === !j.layered), jogOk.map((j) => [j.dir, j.full]));
    rec.ok('jogging, the probe draws each half in its own piece\'s grade on every facing: plain over elite reads normal above the waist and elite below; rare over elite, rare and elite',
      jogOk.every((j) => facingOk(j) && j.probeOk), jogOk.map((j) => [j.dir, j.probeOk, j.figNE, j.figRE]));
    rec.ok('jogging in a plain torso over ELITE greaves, the greaves glow orange on all eight facings (they glowed on two before v2.3.3953)',
      jogOk.every((j) => facingOk(j) && j.neDrawn), jogOk.map((j) => [j.dir, j.ne && j.ne.n, j.ne && j.ne.rgb]));
    rec.ok('...and the glow stays below the waist: the plain torso does not glow',
      jogOk.every((j) => facingOk(j) && j.neBelow), jogOk.map((j) => [j.dir, j.ne && j.ne.up.n, j.ne && j.ne.down.n]));
    rec.ok('jogging in a RARE torso over elite greaves: blue above the waist, orange below, on all eight facings',
      jogOk.every((j) => facingOk(j) && j.reSplit), jogOk.map((j) => [j.dir, j.re]));
    rec.ok('jogging, the glow does not eat into the armour on any facing (the art\'s outer band changes no more than its middle)',
      jogOk.every((j) => facingOk(j) && j.notEaten), jogOk.map((j) => [j.dir, j.ring]));
    const jb0 = Object.values(jog).find((r) => r.box);
    if (jb0) {
      /* tiles are cut at each facing's own box; drawn at the first's size */
      const tiles = [];
      for (let c = 0; c < CASES.length; c++) for (let f = 0; f < FACINGS.length; f++) tiles.push(jogTiles[f * CASES.length + c]);
      await grid(A, ['Plain', 'Plain / elite legs', 'Rare / elite legs'], FACINGS.map(([d]) => d.replace('north', 'N').replace('south', 'S').replace('east', 'E').replace('west', 'W')),
        tiles, jb0.box.width, jb0.box.height, join(OUT, 'armorgrade-jog-grid.png'));
    }

    /* ── 3. the arm drawn again over the sword, in a graded full set ──
       On an east jog with a sword out the arm is re-drawn over the slung
       shield (a CLONE of the body under a mask; glint.js pins its filter to
       the whole frame, unmaskedArea).  Its glow must be the body's own -- the
       same pixels, the same rainbow -- or the arm reads as a patch. */
    await H.hopTo(A, HOME.x, HOME.y).catch(() => {});
    await H.devOp(wsPort, 'kit', aId, { what: 'weapons' });
    await A.page.waitForTimeout(1200);
    await H.equipWeapon(A, 'greatsword', 'weapon', 'melee').catch(() => {});
    await A.page.waitForTimeout(1200);
    for (let i = 0; i < 3; i++) { await H.closeNpcDialogue(A).catch(() => {}); await A.page.waitForTimeout(200); }
    await setGear(A, 'chest', 'copperplate');
    await setGear(A, 'legs', 'coppergreaves');
    const HIDE = ['_weaponContainer', '_shieldSprite', '_handCapSprite', '_handArmShirt', '_handArmCape'];
    const armChange = async (grade) => {
      await H.hopTo(A, HOME.x - 80, HOME.y).catch(() => {});
      await setGrades(A, grade);
      await stick(A, 1, 0);
      let capOn = false;
      for (let i = 0; i < 60 && !capOn; i++) {
        await A.page.waitForTimeout(60);
        capOn = await A.page.evaluate(() => !!(window.__btArmCapsule && window.__btArmCapsule.on));
      }
      await freeze(A);
      const armBox = await H.figureBox(A, { pad: 30 });
      const shot = async (alpha) => {
        await A.page.evaluate(({ a, hide }) => {
          const pd = window._pixiRenderer.playerDisplayRaw();
          for (const k of hide) if (pd[k]) pd[k].renderable = false;
          if (pd._handArmSprite) pd._handArmSprite.alpha = a;
        }, { a: alpha, hide: HIDE });
        await drawFrozen(A);
        const f = await A.page.evaluate(() => {
          const h = window._pixiRenderer.playerDisplayRaw()._handArmSprite;
          return { shown: !!(h && h.visible), filtered: !!(h && Array.isArray(h.filters) && h.filters.some((x) => x && x.resources && x.resources.glintUniforms)) };
        });
        const buf = armBox ? await A.page.screenshot({ clip: armBox }) : null;
        /* QA_AG_DUMP=1: keep the pictures, to see where the clone changes any */
        if (buf && process.env.QA_AG_DUMP) writeFileSync(join(OUT, `ag-arm-${grade}-${alpha}.png`), buf);
        return { f, img: buf ? H.decodePng(buf) : null };
      };
      const s0 = await shot(0), s1 = await shot(1);
      const p = (await probe(A)).glint;
      /* the clone is the body's texture under a mask: with the same place,
         the same filter frame (glint.js pins both to unmaskedArea) and the
         same grade uniforms -- v2.3.3953: both halves, the waist and the
         glow's step too -- every pixel of its glow is the body's */
      const frame = await A.page.evaluate(() => {
        const pd = window._pixiRenderer.playerDisplayRaw();
        const arm = pd._handArmSprite, body = pd._spriteBody;
        const area = (sp) => (sp && sp.filterArea ? [sp.filterArea.x, sp.filterArea.y, sp.filterArea.width, sp.filterArea.height] : null);
        const look = (sp) => {
          const f = sp && Array.isArray(sp.filters) && sp.filters.find((x) => x && x.resources && x.resources.glintUniforms);
          if (!f) return null;
          const u = f.resources.glintUniforms.uniforms;
          return [...Array.from(u.uGrade), u.uPrism, ...Array.from(u.uGrade2 || []), u.uPrism2, u.uSplitY, u.uTime, u.uRim, u.uRimSkip].map((v) => Math.round((v || 0) * 1000) / 1000);
        };
        const place = (sp) => (sp ? [sp.x, sp.y, sp.scale.x, sp.scale.y, sp.anchor ? sp.anchor.x : 0, sp.anchor ? sp.anchor.y : 0] : null);
        const same = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.01);
        return {
          sameTex: !!(arm && body && arm.texture === body.texture),
          samePlace: same(place(arm), place(body)), sameArea: same(area(arm), area(body)), sameLook: same(look(arm), look(body)),
          arm: { area: area(arm), look: look(arm) }, body: { area: area(body), look: look(body) },
        };
      });
      await A.page.evaluate((hide) => {
        const pd = window._pixiRenderer.playerDisplayRaw();
        for (const k of hide) if (pd[k]) pd[k].renderable = true;
        if (pd._handArmSprite) pd._handArmSprite.alpha = 1;
      }, HIDE);
      await thaw(A);
      await stick(A, 0, 0);
      let n = null, big = null;
      if (s0.img && s1.img) {
        n = 0; big = 0;
        for (let i = 0; i < s0.img.data.length; i += s0.img.channels) {
          const dd = Math.abs(s0.img.data[i] - s1.img.data[i]) + Math.abs(s0.img.data[i + 1] - s1.img.data[i + 1]) + Math.abs(s0.img.data[i + 2] - s1.img.data[i + 2]);
          if (dd > 24) n++;
          if (dd > 120) big++;
        }
      }
      return { capOn, clone: s1.f, n, big, grade: ((p.figures || {})['self:c'] || {}).above || 'normal', frame };
    };
    const armPlain = await armChange('normal');
    const armGodly = await armChange('godly');
    console.log('    the arm re-drawn over the sword changes ' + armGodly.n + ' pixels in godly armour (' + armGodly.big + ' by much), ' + armPlain.n + ' in plain (' + armPlain.big + ' by much)');
    rec.ok('the arm drawn again over the sword is on the picture (guard: drawn twice, its soft edges change some pixels in plain armour)',
      armPlain.capOn && armPlain.n != null && armPlain.n >= 20, armPlain);
    rec.ok('jogging east with a sword out in a godly full set, the arm drawn again over it wears the body\'s own look: the same picture, place, filter frame and grade uniforms as the body under it',
      armPlain.capOn && armGodly.capOn && armGodly.clone.shown && armGodly.clone.filtered && armGodly.grade === 'godly'
        && armGodly.frame.sameTex && armGodly.frame.samePlace && armGodly.frame.sameArea && armGodly.frame.sameLook, { plain: armPlain, godly: armGodly });
    rec.ok(`...and on the picture it changes next to nothing by much: ${armGodly.big} pixels in godly armour, ${armPlain.big} in plain`,
      armPlain.big != null && armGodly.big != null && armGodly.big <= armPlain.big + 15, { plain: { n: armPlain.n, big: armPlain.big }, godly: { n: armGodly.n, big: armGodly.big } });
    await setGrades(A, 'normal');
    await H.hopTo(A, HOME.x, HOME.y).catch(() => {});
    await A.page.waitForTimeout(800);

    /* ── 4. the light effects off ── */
    await setGear(A, 'chest', 'ironplate');
    await setGear(A, 'legs', 'irongreaves');
    await setGrades(A, 'rare');
    await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.set(false); });
    await A.page.waitForTimeout(800);
    const off = await probe(A);
    await A.page.evaluate(() => { if (window.__btLightFx) window.__btLightFx.set(true); });
    rec.ok('with the light effects OFF a rare set still wears its grade, and only the graded pieces are filtered',
      !!off && off.on === false && off.glint.graded === 2 && (off.glint.grades || {})['self:c'] === 'rare' && off.glint.sheen === 0, off && off.glint);
    await setGrades(A, 'normal');

    /* ── 5. another player sees it: plain torso over elite greaves, then elite both ── */
    await H.devOp(wsPort, 'kit', aId, { what: 'armor', quality: 'elite' });
    await H.devOp(wsPort, 'kit', aId, { what: 'armor' });
    let pieces = null;
    for (let i = 0; i < 40 && !pieces; i++) {
      pieces = await A.page.evaluate(() => {
        const R = window._gameState.current.rpg || {};
        const plain = (x) => !x.quality || x.quality === 'normal';
        const t = (R.armorStash || []).find((x) => x && x.name === 'Iron Torso' && x.quality === 'elite' && x.gid);
        const tp = (R.armorStash || []).find((x) => x && x.name === 'Iron Torso' && plain(x) && x.gid);
        const l = (R.legsStash || []).find((x) => x && x.name === 'Iron Greaves' && x.quality === 'elite' && x.gid);
        return t && l && tp ? { t: t.gid, tp: tp.gid, l: l.gid } : null;
      });
      if (!pieces) await A.page.waitForTimeout(300);
    }
    rec.ok('the admin kit hands out iron torsos (elite and plain) and elite greaves the worker minted, into the bag with their grades', !!pieces, pieces);
    if (pieces) {
      /* worn by their ids, the real equip lane (grids.js armorRef) */
      const wear = (t, l) => A.page.evaluate(({ t, l }) => {
        const S = window._gameState.current;
        const R = S.rpg;
        const all = (R.armorStash || []).concat(R.armor ? [R.armor] : []);
        const allL = (R.legsStash || []).concat(R.legsArmor ? [R.legsArmor] : []);
        R.armor = all.find((x) => x && x.gid === t) || R.armor;
        R.legsArmor = allL.find((x) => x && x.gid === l) || R.legsArmor;
        if (window.__btSetGear) { window.__btSetGear('chest', 'ironplate'); window.__btSetGear('legs', 'irongreaves'); }
        S.channel.send({ type: 'stats_update', payload: { armorRef: t, legsArmorRef: l } });
      }, { t, l });
      await wear(pieces.tp, pieces.l);
      await A.page.waitForTimeout(800);
      /* at 3 device px a CSS px, an iPhone's */
      const B = await H.newPlayer(browser, { name: 'Witness', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: COACH_OFF });
      opened.push(B);
      B.page.on('pageerror', (e) => errors.push('B: ' + String(e).slice(0, 200)));
      const stopB = H.keepAlive(B);
      try {
        await H.enterWorld(B);
        await H.waitFor(B, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
          (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'B into the world' }).catch(() => null);
        const bId = await H.readState(B, (S) => S.myId);
        await H.devOp(wsPort, 'quests', bId).catch(() => {});
        await skipWelcome(B);
        await B.page.addStyleTag({ content: '[data-coach],[data-coach-card],[data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
        await H.hopTo(B, HOME.x + 70, HOME.y).catch(() => {});
        for (let i = 0; i < 3; i++) { await H.closeNpcDialogue(B).catch(() => {}); await B.page.waitForTimeout(300); }
        await H.hopTo(A, HOME.x - 20, HOME.y).catch(() => {});
        await H.hopTo(A, HOME.x, HOME.y - 60).catch(() => {});
        /* A jogs south (a facing with the full-set figure) while B watches */
        await stick(A, 0, 1);
        let seenJog = null;
        for (let i = 0; i < 40; i++) {
          seenJog = await B.page.evaluate((id) => {
            const o = (window._gameState.current.others || {})[id];
            const p = window.__btLightFx ? window.__btLightFx.probe() : null;
            return o ? { eqg: o._eqg, fig: p && (p.glint.figures || {})[id + ':c'], grades: p && p.glint.grades } : null;
          }, aId);
          if (seenJog && seenJog.eqg === 'ne' && seenJog.fig && seenJog.fig.below === 'elite') break;
          await B.page.waitForTimeout(150);
        }
        await stick(A, 0, 0);
        rec.ok('another player is told "ne" by the worker and, A jogging in the full set, draws A\'s figure plain above the waist and elite below',
          !!seenJog && seenJog.eqg === 'ne' && !!seenJog.fig && seenJog.fig.above === 'normal' && seenJog.fig.below === 'elite' && seenJog.fig.split > 0.4, seenJog);
        await wear(pieces.t, pieces.l);
        await A.page.waitForTimeout(600);
        await H.hopTo(A, HOME.x, HOME.y).catch(() => {});
        let seen = null;
        for (let i = 0; i < 30; i++) {
          seen = await B.page.evaluate((id) => {
            const o = (window._gameState.current.others || {})[id];
            const p = window.__btLightFx ? window.__btLightFx.probe() : null;
            return o ? { eqg: o._eqg, equip: o.equip, grades: p && p.glint.grades } : null;
          }, aId);
          if (seen && seen.eqg === 'ee' && seen.grades && seen.grades[aId + ':c'] === 'elite' && seen.grades[aId + ':l'] === 'elite') break;
          await B.page.waitForTimeout(400);
        }
        const pb = await H.figureBox(B, { pad: 34, peerId: aId }).catch(() => null);
        const sb = await H.figureBox(B, { pad: 34 }).catch(() => null);
        if (pb && sb) {
          const x0 = Math.max(0, Math.min(pb.x, sb.x) - 24), y0 = Math.max(0, Math.min(pb.y, sb.y) - 16);
          const x1 = Math.max(pb.x + pb.width, sb.x + sb.width) + 24, y1 = Math.max(pb.y + pb.height, sb.y + sb.height) + 16;
          await B.page.screenshot({ path: join(OUT, 'armorgrade-peer.png'), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }).catch(() => {});
        }
        rec.ok('another player is told the grade by the worker (eqg "ee") and draws both of A\'s pieces elite',
          !!seen && seen.eqg === 'ee' && !!seen.grades && seen.grades[aId + ':c'] === 'elite' && seen.grades[aId + ':l'] === 'elite', seen);
      } finally { try { stopB && stopB(); } catch (e) { /* gone */ } }
    }

    /* ── 6. the bag says the same: elite orange, godly a rainbow ring ── */
    await H.devOp(wsPort, 'kit', aId, { what: 'armor', quality: 'godly' });
    await A.page.waitForTimeout(1200);
    await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) { /* older build */ } });
    await A.page.waitForTimeout(1500);
    const bagTiles = await A.page.evaluate(() => [...document.querySelectorAll('[data-bag-key^="stashArmor-"], [data-bag-key^="stashLegs-"]')]
      .filter((el) => el.offsetParent)
      .map((el) => ({ name: el.title, border: getComputedStyle(el).borderTopColor, godly: el.classList.contains('ls-slot--godly'),
        ring: el.classList.contains('ls-slot--godly') ? getComputedStyle(el, '::after').backgroundImage : '' })));
    const eliteTiles = bagTiles.filter((t) => t.border === 'rgb(232, 137, 58)');
    const godlyTiles = bagTiles.filter((t) => t.godly);
    rec.ok('the bag: an elite piece\'s edge is orange (#E8893A), not the old purple', eliteTiles.length >= 1 && !bagTiles.some((t) => t.border === 'rgb(164, 119, 223)'), bagTiles);
    rec.ok('the bag: a godly piece wears the ring, and the ring is a rainbow',
      godlyTiles.length >= 2 && godlyTiles.every((t) => ['255, 107, 107', '255, 209, 102', '107, 255, 149', '92, 184, 255', '199, 125, 255'].every((c) => t.ring.includes(c))),
      godlyTiles);
    const bagBox = await A.page.evaluate(() => {
      const els = [...document.querySelectorAll('[data-bag-key^="stashArmor-"], [data-bag-key^="stashLegs-"]')].filter((el) => el.offsetParent);
      if (!els.length) return null;
      const r = els.map((el) => el.getBoundingClientRect());
      const x0 = Math.min(...r.map((q) => q.left)), y0 = Math.min(...r.map((q) => q.top));
      const x1 = Math.max(...r.map((q) => q.right)), y1 = Math.max(...r.map((q) => q.bottom));
      return { x: Math.max(0, x0 - 12), y: Math.max(0, y0 - 12), width: Math.min(innerWidth, x1 + 12) - Math.max(0, x0 - 12), height: y1 - y0 + 24 };
    });
    if (bagBox && bagBox.width > 0 && bagBox.height > 0) await A.page.screenshot({ path: join(OUT, 'armorgrade-bag.png'), clip: bagBox }).catch(() => {});
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    try { stopA && stopA(); } catch (e) { /* gone */ }
  }
}
